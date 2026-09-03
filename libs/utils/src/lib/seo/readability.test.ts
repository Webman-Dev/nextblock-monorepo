import { describe, expect, it } from 'vitest';
import { computeReadability, countSyllables, splitSentences } from './readability';

describe('countSyllables', () => {
  it('counts a vowel cluster once rather than once per vowel', () => {
    expect(countSyllables('beautiful')).toBe(3);
    expect(countSyllables('queue')).toBe(1);
  });

  it('drops a silent trailing e', () => {
    expect(countSyllables('hope')).toBe(1);
    expect(countSyllables('care')).toBe(1);
  });

  it('keeps the syllable when le follows a consonant', () => {
    expect(countSyllables('table')).toBe(2);
    expect(countSyllables('simple')).toBe(2);
    expect(countSyllables('people')).toBe(2);
  });

  it('treats an inflectional -es or -ed as silent', () => {
    expect(countSyllables('hopes')).toBe(1);
    expect(countSyllables('walked')).toBe(1);
  });

  it('keeps -es and -ed when the stem makes them voiced', () => {
    expect(countSyllables('watches')).toBe(2);
    expect(countSyllables('wanted')).toBe(2);
  });

  it('treats very short words as a single syllable', () => {
    expect(countSyllables('the')).toBe(1);
    expect(countSyllables('a')).toBe(1);
    expect(countSyllables('yes')).toBe(1);
  });

  it('never returns zero for a word that has letters', () => {
    expect(countSyllables('rhythm')).toBe(1);
    expect(countSyllables('HELLO')).toBe(2);
  });

  it('returns zero when there are no letters to pronounce', () => {
    expect(countSyllables('')).toBe(0);
    expect(countSyllables('123')).toBe(0);
    expect(countSyllables('---')).toBe(0);
  });

  it('folds diacritics instead of deleting the letters that carry them', () => {
    // Stripping to [a-z] without folding turned "préféré" into "prfr", which has
    // no vowel group at all and fell through to the floor of 1. This CMS is
    // bilingual, so that was a live wrong answer on every French page.
    expect(countSyllables('préféré')).toBe(countSyllables('prefere'));
    expect(countSyllables('préféré')).toBe(2);
    expect(countSyllables('déjà')).toBe(2);
    expect(countSyllables('naïve')).toBe(countSyllables('naive'));
    expect(countSyllables('Ünterstützung')).toBe(countSyllables('Unterstutzung'));
  });

  it('still reports a non-Latin word as unpronounceable rather than guessing', () => {
    // Nothing here folds to an ASCII letter, so there is no syllable estimate to
    // make. `computeReadability` is what turns this into an honest answer.
    expect(countSyllables('日本語')).toBe(0);
    expect(countSyllables('Привет')).toBe(0);
  });
});

describe('splitSentences', () => {
  it('splits on a terminator followed by whitespace or the end of the string', () => {
    expect(splitSentences('One. Two! Three?')).toEqual(['One.', 'Two!', 'Three?']);
  });

  it('does not split inside a decimal number', () => {
    expect(splitSentences('The value is 3.14 exactly. Yes.')).toEqual([
      'The value is 3.14 exactly.',
      'Yes.',
    ]);
  });

  it('does not split on an ellipsis', () => {
    expect(splitSentences('Wait... really? Yes.')).toEqual(['Wait... really?', 'Yes.']);
  });

  it('does not split after a known abbreviation', () => {
    expect(splitSentences('Mr. Smith went home. He slept.')).toEqual([
      'Mr. Smith went home.',
      'He slept.',
    ]);
    expect(splitSentences('Use a tool, e.g. a hammer. Then stop.')).toEqual([
      'Use a tool, e.g. a hammer.',
      'Then stop.',
    ]);
    expect(splitSentences('Acme Inc. and Beta Ltd. merged.')).toEqual([
      'Acme Inc. and Beta Ltd. merged.',
    ]);
  });

  it('does not split on a dotted initialism that nobody thought to list', () => {
    // The hardcoded set can only hold the forms somebody remembered. Every one
    // it missed doubled the sentence count of the paragraph it appeared in.
    expect(splitSentences('The U.S. market grew. Then it fell.')).toEqual([
      'The U.S. market grew.',
      'Then it fell.',
    ]);
    expect(splitSentences('We open at 9 a.m. every weekday. Come by.')).toEqual([
      'We open at 9 a.m. every weekday.',
      'Come by.',
    ]);
    expect(splitSentences('J. R. R. Tolkien wrote it.')).toEqual(['J. R. R. Tolkien wrote it.']);
  });

  it('does not split after the prose abbreviations the list was missing', () => {
    expect(splitSentences('See fig. 4 and approx. 20 more. Then stop.')).toEqual([
      'See fig. 4 and approx. 20 more.',
      'Then stop.',
    ]);
    expect(splitSentences('Smith et al. found the same. We agree.')).toEqual([
      'Smith et al. found the same.',
      'We agree.',
    ]);
  });

  it('only treats a numbered abbreviation as one when a number follows', () => {
    // "No." introduces a number; "no." ends a sentence. Putting it in the
    // unconditional list would merge two sentences and move the score the wrong
    // way, so the digit that gives the form its meaning is required.
    expect(splitSentences('Take ticket no. 5 first. Then wait.')).toEqual([
      'Take ticket no. 5 first.',
      'Then wait.',
    ]);
    expect(splitSentences('Is it ready? No. We need more time.')).toEqual([
      'Is it ready?',
      'No.',
      'We need more time.',
    ]);
  });

  it('carries a closing quote into the sentence that owns it', () => {
    expect(splitSentences('He said "Stop." Then he left.')).toEqual([
      'He said "Stop."',
      'Then he left.',
    ]);
  });

  it('keeps a trailing fragment that has no terminator', () => {
    expect(splitSentences('Finished. Not finished')).toEqual(['Finished.', 'Not finished']);
    expect(splitSentences('No terminator here')).toEqual(['No terminator here']);
  });

  it('returns nothing for blank input', () => {
    expect(splitSentences('')).toEqual([]);
    expect(splitSentences('   \n  ')).toEqual([]);
  });
});

describe('computeReadability', () => {
  it('returns an explicitly zeroed result rather than dividing by zero', () => {
    // Every field has to be a real number here. A NaN would propagate into the
    // score, the band and finally into the badge the author sees.
    const stats = computeReadability('');

    expect(stats).toEqual({
      averageSentenceLength: 0,
      averageSyllablesPerWord: 0,
      fleschReadingEase: 0,
      grade: 'Not enough content',
      sentenceCount: 0,
      syllableCount: 0,
      wordCount: 0,
    });
  });

  it('treats punctuation-only input as having nothing to measure', () => {
    expect(computeReadability('!!! ??? ...').wordCount).toBe(0);
    expect(computeReadability('!!! ??? ...').grade).toBe('Not enough content');
  });

  it('reports the counts it derived the score from', () => {
    const stats = computeReadability('One two three. Four five.');

    expect(stats.wordCount).toBe(5);
    expect(stats.sentenceCount).toBe(2);
    expect(stats.syllableCount).toBe(5);
    expect(stats.averageSentenceLength).toBe(2.5);
    expect(stats.averageSyllablesPerWord).toBe(1);
  });

  it('clamps a score that the raw formula pushes above 100', () => {
    const stats = computeReadability('Cat.');

    expect(stats.fleschReadingEase).toBe(100);
    expect(stats.grade).toBe('Very easy');
  });

  it('clamps a score that the raw formula pushes below 0', () => {
    const monstrous = `${new Array(60).fill('incomprehensibility').join(' ')}.`;
    const stats = computeReadability(monstrous);

    expect(stats.fleschReadingEase).toBe(0);
    expect(stats.grade).toBe('Very confusing');
  });

  it('rounds the derived averages to one decimal', () => {
    const stats = computeReadability('One two three. Four five six seven.');

    expect(stats.averageSentenceLength).toBe(3.5);
    expect(Number.isFinite(stats.fleschReadingEase)).toBe(true);
    expect(stats.fleschReadingEase).toBe(Math.round(stats.fleschReadingEase * 10) / 10);
  });

  it('refuses to score text this English heuristic cannot read', () => {
    // Every token here counts zero syllables, which drives the formula to its
    // maximum. Reporting that as a confident 100 and "Very easy" claimed the
    // page was the easiest possible read when nothing had actually been read.
    const japanese = computeReadability('これはテストです。もう一度です。');

    expect(japanese.fleschReadingEase).toBe(0);
    expect(japanese.grade).toBe('Not analysable');
    expect(japanese.syllableCount).toBe(0);
    expect(japanese.wordCount).toBe(0);
  });

  it('still scores French, because folding diacritics leaves syllables to count', () => {
    // The same guard must not swallow a language the heuristic can approximate.
    const french = computeReadability('Nous avons préféré la première option. Elle est déjà prête.');

    expect(french.grade).not.toBe('Not analysable');
    expect(french.syllableCount).toBeGreaterThan(0);
    expect(french.sentenceCount).toBe(2);
  });

  it('lands a plain-English paragraph in a readable band', () => {
    const stats = computeReadability(
      'We ship every order fast. We pack it with care. Your pet will love the food we send.'
    );

    expect(stats.fleschReadingEase).toBeGreaterThanOrEqual(50);
    expect(stats.sentenceCount).toBe(3);
  });
});
