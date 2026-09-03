import { tokenizeWords } from './document';
import type { ReadabilityStats } from './types';

/**
 * Flesch Reading Ease, computed without a dictionary.
 *
 * The formula needs three counts — words, sentences and syllables — and only
 * the first is unambiguous. Sentence detection and syllable counting are both
 * heuristics, and the point of this module is that they are *deterministic*
 * heuristics: the same string always yields the same number, in the browser, in
 * Node and in the proxy, with no data files and no network. An author watching
 * the score move while they edit cares far more about that stability than about
 * the last decimal of linguistic accuracy.
 */

/**
 * Abbreviations whose trailing period is not a sentence boundary.
 *
 * Stored lowercased and without the final period. Multi-part forms such as
 * "e.g" are stored with their internal periods intact because the boundary
 * scanner captures the whole dotted token before looking it up, which is what
 * lets "e.g. a hammer" stay inside one sentence.
 */
const SENTENCE_ABBREVIATIONS = new Set([
  'al', 'approx', 'cf', 'dept', 'dr', 'e.g', 'est', 'etc', 'i.e', 'inc', 'jr',
  'ltd', 'max', 'min', 'mr', 'mrs', 'ms', 'prof', 'sr', 'st', 'vs',
]);

/**
 * Abbreviations that introduce a number, and are only abbreviations when one
 * actually follows.
 *
 * These are kept apart from the set above because every one of them is also an
 * ordinary English word or a plausible sentence ending: putting "no" in the
 * unconditional set would swallow the full stop in "Is it ready? No. We need
 * more time." and merge two sentences into one, which moves the score in the
 * opposite direction from the bug this list exists to fix. Requiring a digit
 * next ("No. 5", "pp. 12", "Fig. 3", "Vol. 2") is what those four forms
 * actually mean, so the guard is not a heuristic patch — it is the definition.
 */
const NUMBERED_ABBREVIATIONS = new Set(['fig', 'no', 'pp', 'vol']);

/**
 * An initialism: a single letter, or single letters joined by periods.
 *
 * The hardcoded set above can only ever list the dotted forms somebody thought
 * of, and every one it misses — "U.S.", "a.m.", "J. R. R. Tolkien" — is read as
 * a sentence boundary, which doubles the sentence count of an affected page and
 * moves Flesch by roughly 24 points. Matching the *shape* instead covers the
 * whole family at once, including the ones nobody has written down yet.
 */
const INITIALISM_PATTERN = /^[A-Za-z](?:\.[A-Za-z])*$/;

/**
 * Characters allowed to sit between a terminator and the whitespace that closes
 * a sentence, so that a quoted or parenthesised sentence still ends where a
 * reader would say it ends.
 */
const CLOSING_PUNCTUATION_PATTERN = /["'”’»)\]]/;

/** Rounds to one decimal place without dragging in a formatting dependency. */
function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

/**
 * Estimates the number of spoken syllables in an English word.
 *
 * The heuristic, in order:
 *
 *  1. Diacritics are folded away and then non-letters are discarded, so
 *     punctuation and digits never contribute. Folding first is load-bearing:
 *     this CMS is bilingual, and stripping to `[a-z]` without folding deletes
 *     the accented vowels of French outright, so "préféré" collapsed to "prfr"
 *     and counted 1 syllable instead of 2. A token that still has no ASCII
 *     letters after folding (a bare number, or a word in a non-Latin script)
 *     returns 0 rather than a misleading 1.
 *  2. Words of three letters or fewer are one syllable. This is not strictly
 *     true, but it is true often enough that the vowel-group rules below,
 *     which misfire badly on short words, are simply skipped.
 *  3. A consonant followed by "le" at the end of a word forms its own syllable
 *     ("ta-ble", "lit-tle"), so those words are exempted from every silent-
 *     ending rule before the rules get a chance to eat the final "e".
 *  4. A trailing "-es" or "-ed" after a consonant is an inflection that adds no
 *     syllable ("hopes", "walked") *unless* the stem ends in a sibilant or in
 *     d/t, where the ending is voiced as its own syllable ("watches",
 *     "wanted"). Otherwise a lone trailing "e" is silent and is dropped.
 *  5. What remains is counted as runs of vowels, so a vowel cluster such as the
 *     "eau" in "beautiful" counts once rather than three times. The letter "y"
 *     is treated as a vowel, which is right far more often than not.
 *  6. Any word that still counts zero is reported as one, because a word that
 *     is pronounced at all is pronounced in at least one syllable.
 *
 * Known limits, accepted deliberately: compound and loan words are frequently
 * off by one ("business" counts 3, is spoken as 2), silent-vowel names are
 * unreliable, and the rules are English-only. Folding diacritics lets French
 * words be counted at all, but they are still counted by English rules, so a
 * pronounced final "e" is read as silent and "café" comes back as 1 rather than
 * 2. That is an off-by-one on a word the previous code scored 1 anyway, which is
 * a far smaller error than deleting the vowels. Flesch Reading Ease is itself an
 * English-only measure, so a per-word error of roughly one in ten does not move
 * the aggregate score enough to change which band a page lands in.
 */
export function countSyllables(word: string): number {
  // NFD splits an accented character into its base letter plus a combining
  // mark, so removing the marks leaves the base letter behind instead of
  // removing the whole character along with it.
  const cleaned = word
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
  if (cleaned.length === 0) {
    return 0;
  }

  if (cleaned.length <= 3) {
    return 1;
  }

  let working = cleaned;
  const hasConsonantLeEnding = /[^aeiou]le$/.test(working);

  if (!hasConsonantLeEnding) {
    if (/[^aeiou]es$/.test(working) && !/(?:ch|sh|[cgsxz])es$/.test(working)) {
      working = working.slice(0, -2);
    } else if (/[^aeiou]ed$/.test(working) && !/[dt]ed$/.test(working)) {
      working = working.slice(0, -2);
    } else if (/e$/.test(working)) {
      working = working.slice(0, -1);
    }
  }

  const vowelGroups = working.match(/[aeiouy]+/g);

  return Math.max(1, vowelGroups === null ? 0 : vowelGroups.length);
}

/**
 * True when the next thing after `cursor`, ignoring the single space the
 * whitespace normalisation may have left, is a digit.
 */
function isFollowedByDigit(text: string, cursor: number): boolean {
  let index = cursor;
  while (index < text.length && text[index] === ' ') {
    index += 1;
  }

  return index < text.length && text[index] >= '0' && text[index] <= '9';
}

/**
 * Decides whether the dotted token that ends just before a period is an
 * abbreviation rather than the last word of a sentence.
 *
 * `cursor` points just past the period (and past any closing quote), so the
 * numbered forms can look ahead for the number they introduce.
 */
function isAbbreviation(token: string, text: string, cursor: number): boolean {
  const lowered = token.toLowerCase();

  if (SENTENCE_ABBREVIATIONS.has(lowered)) {
    return true;
  }

  if (NUMBERED_ABBREVIATIONS.has(lowered)) {
    return isFollowedByDigit(text, cursor);
  }

  return INITIALISM_PATTERN.test(token);
}

/**
 * Splits prose into sentences.
 *
 * A run of `.`, `!` or `?` closes a sentence only when whitespace (or the end
 * of the string) follows it, optionally across closing quotes and brackets.
 * That single rule already handles the two commonest false positives for free:
 * the period in "3.14" and the dot in "example.com" are both followed by a
 * letter or a digit, so neither splits. Two further guards are applied on top:
 *
 *  - a run of two or more periods is an ellipsis, which is a pause rather than
 *    a full stop, and
 *  - a lone period immediately preceded by an abbreviation ("Mr.", "e.g.",
 *    "U.S.", "No. 5") is part of that abbreviation. An abbreviation is
 *    recognised either by name, from the two sets above, or by shape, from
 *    `INITIALISM_PATTERN` — the shape test is what stops every dotted
 *    initialism nobody remembered to list from splitting a sentence in two.
 *
 * Whitespace is normalised first so the scanner only ever has to look for a
 * single space, and empty fragments are dropped so a string of terminators
 * cannot inflate the sentence count and deflate the readability score.
 */
export function splitSentences(text: string): string[] {
  const normalized = typeof text === 'string' ? text.replace(/\s+/g, ' ').trim() : '';
  if (normalized === '') {
    return [];
  }

  const sentences: string[] = [];
  const terminators = /[.!?]+/g;
  let start = 0;
  let match: RegExpExecArray | null;

  while ((match = terminators.exec(normalized)) !== null) {
    const run = match[0];
    let cursor = match.index + run.length;

    while (cursor < normalized.length && CLOSING_PUNCTUATION_PATTERN.test(normalized[cursor])) {
      cursor += 1;
    }

    const following = cursor < normalized.length ? normalized[cursor] : undefined;
    if (following !== undefined && following !== ' ') {
      continue;
    }

    if (/^\.{2,}$/.test(run)) {
      continue;
    }

    if (run === '.') {
      const preceding = /([A-Za-z]+(?:\.[A-Za-z]+)*)$/.exec(normalized.slice(0, match.index));
      if (preceding !== null && isAbbreviation(preceding[1], normalized, cursor)) {
        continue;
      }
    }

    const sentence = normalized.slice(start, cursor).trim();
    if (sentence !== '') {
      sentences.push(sentence);
    }

    start = cursor;
  }

  const tail = normalized.slice(start).trim();
  if (tail !== '') {
    sentences.push(tail);
  }

  return sentences;
}

/**
 * Maps a Flesch Reading Ease score onto the conventional descriptive bands.
 * These are the bands Flesch published, not an invention of ours, so they stay
 * as-is even though the top band is nearly unreachable for technical writing.
 */
function toGrade(score: number): string {
  if (score >= 90) return 'Very easy';
  if (score >= 80) return 'Easy';
  if (score >= 70) return 'Fairly easy';
  if (score >= 60) return 'Standard';
  if (score >= 50) return 'Fairly difficult';
  if (score >= 30) return 'Difficult';

  return 'Very confusing';
}

/**
 * The result returned when there is nothing to measure.
 *
 * This is the guard against the two divisions in the Flesch formula. With no
 * words or no sentences the formula produces `NaN` or `Infinity`, either of
 * which would propagate through the score, the band and finally into the UI as
 * a blank or "NaN" badge. Returning an explicit zeroed record with a grade that
 * says so keeps every downstream consumer on the happy path.
 */
function notEnoughContent(): ReadabilityStats {
  return {
    averageSentenceLength: 0,
    averageSyllablesPerWord: 0,
    fleschReadingEase: 0,
    grade: 'Not enough content',
    sentenceCount: 0,
    syllableCount: 0,
    wordCount: 0,
  };
}

/**
 * The result returned for text this English heuristic cannot read.
 *
 * Same zeroed shape as `notEnoughContent`, different grade, because the two are
 * different statements: one says "there is nothing here yet", the other says
 * "there is plenty here and none of it is in an alphabet Flesch was defined
 * over". Both keep the caller on the happy path with real numbers.
 */
function notAnalysable(): ReadabilityStats {
  return { ...notEnoughContent(), grade: 'Not analysable' };
}

/**
 * Computes Flesch Reading Ease:
 *
 *   206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words)
 *
 * The raw formula is unbounded in both directions — a single one-syllable word
 * scores over 120, and a page of long polysyllabic sentences goes negative — so
 * the result is clamped to 0..100 before it is reported. The clamp is applied
 * to the score only; the averages it was derived from are reported unclamped so
 * that the UI can explain an extreme score instead of hiding it.
 *
 * Flesch Reading Ease is an English-language measure, and `countSyllables` is an
 * English-language heuristic that works on the Latin alphabet. A page written in
 * Japanese, Greek or Cyrillic therefore yields a syllable total of zero, and the
 * formula then hands back its maximum: the earlier code reported that as a
 * confident 100 and "Very easy" for text it had not read a single syllable of.
 * The wrong assumption was that a zero syllable total could only mean an empty
 * page. It also means "this is not the kind of text the metric applies to", and
 * claiming a score for Japanese is worse than admitting the metric does not
 * apply, so that case now returns the zeroed `notAnalysable` result instead.
 */
export function computeReadability(text: string): ReadabilityStats {
  const words = tokenizeWords(typeof text === 'string' ? text : '');
  const sentences = splitSentences(typeof text === 'string' ? text : '');

  if (words.length === 0 || sentences.length === 0) {
    return notEnoughContent();
  }

  const wordCount = words.length;
  const sentenceCount = sentences.length;
  const syllableCount = words.reduce((total, word) => total + countSyllables(word), 0);

  if (syllableCount === 0) {
    return notAnalysable();
  }

  const averageSentenceLength = wordCount / sentenceCount;
  const averageSyllablesPerWord = syllableCount / wordCount;
  const rawScore = 206.835 - 1.015 * averageSentenceLength - 84.6 * averageSyllablesPerWord;
  const fleschReadingEase = roundToOneDecimal(clamp(rawScore, 0, 100));

  return {
    averageSentenceLength: roundToOneDecimal(averageSentenceLength),
    averageSyllablesPerWord: roundToOneDecimal(averageSyllablesPerWord),
    fleschReadingEase,
    grade: toGrade(fleschReadingEase),
    sentenceCount,
    syllableCount,
    wordCount,
  };
}
