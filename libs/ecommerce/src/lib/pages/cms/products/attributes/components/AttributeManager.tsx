'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Button, Input, Label } from '@nextblock-cms/ui';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { ProductAttribute } from '../../../../../types';
import type { Database } from '@nextblock-cms/db';

type Language = Database['public']['Tables']['languages']['Row'];

interface AttributeManagerProps {
  attributes: ProductAttribute[];
  languages: Language[];
  createAttributeAction: (input: { name: string; slug?: string }) => Promise<{ success: boolean; error?: string }>;
  deleteAttributeAction: (attributeId: string) => Promise<{ success: boolean; error?: string }>;
  createTermAction: (input: {
    attributeId: string;
    value: string;
    slug?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  deleteTermAction: (termId: string) => Promise<{ success: boolean; error?: string }>;
  reorderTermsAction: (input: {
    attributeId: string;
    orderedTermIds: string[];
  }) => Promise<{ success: boolean; error?: string }>;
  updateTranslationsAction: (input: {
    attributeId: string;
    nameTranslations: Record<string, string>;
    termTranslations: Array<{
      termId: string;
      valueTranslations: Record<string, string>;
    }>;
  }) => Promise<{ success: boolean; error?: string }>;
}

export function AttributeManager({
  attributes,
  languages,
  createAttributeAction,
  deleteAttributeAction,
  createTermAction,
  deleteTermAction,
  reorderTermsAction,
  updateTranslationsAction,
}: AttributeManagerProps) {
  const router = useRouter();
  const [attributeName, setAttributeName] = useState('');
  const [pendingAttributeId, setPendingAttributeId] = useState<string | null>(null);
  const [pendingTermId, setPendingTermId] = useState<string | null>(null);
  const [reorderingAttributeId, setReorderingAttributeId] = useState<string | null>(null);
  const [savingTranslationsAttributeId, setSavingTranslationsAttributeId] = useState<string | null>(null);
  const [termInputs, setTermInputs] = useState<Record<string, string>>({});
  const [attributeTranslations, setAttributeTranslations] = useState<Record<string, Record<string, string>>>(() =>
    attributes.reduce<Record<string, Record<string, string>>>((accumulator, attribute) => {
      accumulator[attribute.id] = attribute.name_translations || {};
      return accumulator;
    }, {})
  );
  const [termTranslations, setTermTranslations] = useState<Record<string, Record<string, string>>>(() =>
    attributes.reduce<Record<string, Record<string, string>>>((accumulator, attribute) => {
      for (const term of attribute.terms) {
        accumulator[term.id] = term.value_translations || {};
      }
      return accumulator;
    }, {})
  );
  const translatableLanguages = languages.filter((language) => !language.is_default);

  const handleCreateAttribute = async (event: React.FormEvent) => {
    event.preventDefault();

    const result = await createAttributeAction({ name: attributeName });
    if (!result.success) {
      alert(result.error || 'Failed to create attribute.');
      return;
    }

    setAttributeName('');
    router.refresh();
  };

  const handleCreateTerm = async (event: React.FormEvent, attributeId: string) => {
    event.preventDefault();
    setPendingAttributeId(attributeId);

    const result = await createTermAction({
      attributeId,
      value: termInputs[attributeId] || '',
    });

    setPendingAttributeId(null);

    if (!result.success) {
      alert(result.error || 'Failed to create term.');
      return;
    }

    setTermInputs((current) => ({
      ...current,
      [attributeId]: '',
    }));
    router.refresh();
  };

  const handleDeleteAttribute = async (attributeId: string) => {
    const confirmed = window.confirm('Delete this attribute and all of its terms?');
    if (!confirmed) {
      return;
    }

    const result = await deleteAttributeAction(attributeId);
    if (!result.success) {
      alert(result.error || 'Failed to delete attribute.');
      return;
    }

    router.refresh();
  };

  const handleDeleteTerm = async (termId: string) => {
    setPendingTermId(termId);
    const result = await deleteTermAction(termId);
    setPendingTermId(null);

    if (!result.success) {
      alert(result.error || 'Failed to delete term.');
      return;
    }

    router.refresh();
  };

  const handleMoveTerm = async (attribute: ProductAttribute, termId: string, direction: -1 | 1) => {
    const currentIndex = attribute.terms.findIndex((term) => term.id === termId);
    const nextIndex = currentIndex + direction;

    if (currentIndex === -1 || nextIndex < 0 || nextIndex >= attribute.terms.length) {
      return;
    }

    const reorderedTerms = [...attribute.terms];
    const [movedTerm] = reorderedTerms.splice(currentIndex, 1);
    reorderedTerms.splice(nextIndex, 0, movedTerm);

    setReorderingAttributeId(attribute.id);
    const result = await reorderTermsAction({
      attributeId: attribute.id,
      orderedTermIds: reorderedTerms.map((term) => term.id),
    });
    setReorderingAttributeId(null);

    if (!result.success) {
      alert(result.error || 'Failed to reorder terms.');
      return;
    }

    router.refresh();
  };

  const handleSaveTranslations = async (attribute: ProductAttribute) => {
    setSavingTranslationsAttributeId(attribute.id);
    const result = await updateTranslationsAction({
      attributeId: attribute.id,
      nameTranslations: attributeTranslations[attribute.id] || {},
      termTranslations: attribute.terms.map((term) => ({
        termId: term.id,
        valueTranslations: termTranslations[term.id] || {},
      })),
    });
    setSavingTranslationsAttributeId(null);

    if (!result.success) {
      alert(result.error || 'Failed to save translations.');
      return;
    }

    router.refresh();
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleCreateAttribute} className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[220px] space-y-2">
            <Label htmlFor="attribute-name">New Attribute</Label>
            <Input
              id="attribute-name"
              value={attributeName}
              onChange={(event) => setAttributeName(event.target.value)}
              placeholder="Material, Size, Color..."
            />
          </div>
          <Button type="submit" disabled={!attributeName.trim()}>
            <Plus className="mr-2 h-4 w-4" />
            Create Attribute
          </Button>
        </div>
      </form>

      {attributes.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          No global attributes have been created yet.
        </div>
      ) : (
        <div className="grid gap-6">
          {attributes.map((attribute) => (
            <div key={attribute.id} className="rounded-lg border bg-card p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">{attribute.name}</h2>
                  <p className="text-sm text-muted-foreground">{attribute.slug}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteAttribute(attribute.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-4 space-y-2">
                {attribute.terms.map((term, index) => (
                  <div
                    key={term.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/20 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="py-1.5">
                        {term.value}
                      </Badge>
                      <span className="text-xs text-muted-foreground">Position {index + 1}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleMoveTerm(attribute, term.id, -1)}
                        disabled={index === 0 || reorderingAttributeId === attribute.id}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleMoveTerm(attribute, term.id, 1)}
                        disabled={
                          index === attribute.terms.length - 1 ||
                          reorderingAttributeId === attribute.id
                        }
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteTerm(term.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        disabled={pendingTermId === term.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <form
                onSubmit={(event) => handleCreateTerm(event, attribute.id)}
                className="mt-6 flex flex-wrap items-end gap-3"
              >
                <div className="flex-1 min-w-[220px] space-y-2">
                  <Label htmlFor={`term-input-${attribute.id}`}>Add Term</Label>
                  <Input
                    id={`term-input-${attribute.id}`}
                    value={termInputs[attribute.id] || ''}
                    onChange={(event) =>
                      setTermInputs((current) => ({
                        ...current,
                        [attribute.id]: event.target.value,
                      }))
                    }
                    placeholder={`Add a term for ${attribute.name}`}
                  />
                </div>
                <Button
                  type="submit"
                  variant="outline"
                  disabled={!termInputs[attribute.id]?.trim() || pendingAttributeId === attribute.id}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {pendingAttributeId === attribute.id ? 'Saving...' : 'Add Term'}
                </Button>
              </form>

              {translatableLanguages.length > 0 && (
                <div className="mt-6 border-t pt-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-medium">Translations</h3>
                      <p className="text-sm text-muted-foreground">
                        Translate the attribute label and each term for every active site language.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleSaveTranslations(attribute)}
                      disabled={savingTranslationsAttributeId === attribute.id}
                    >
                      {savingTranslationsAttributeId === attribute.id ? 'Saving...' : 'Save Translations'}
                    </Button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {translatableLanguages.map((language) => (
                      <div key={`${attribute.id}-${language.code}`} className="space-y-2">
                        <Label htmlFor={`attribute-translation-${attribute.id}-${language.code}`}>
                          Attribute Name ({language.name})
                        </Label>
                        <Input
                          id={`attribute-translation-${attribute.id}-${language.code}`}
                          value={attributeTranslations[attribute.id]?.[language.code] || ''}
                          onChange={(event) =>
                            setAttributeTranslations((current) => ({
                              ...current,
                              [attribute.id]: {
                                ...(current[attribute.id] || {}),
                                [language.code]: event.target.value,
                              },
                            }))
                          }
                          placeholder={attribute.name}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3">
                    {attribute.terms.map((term) => (
                      <div key={`translations-${term.id}`} className="rounded-lg border p-4 space-y-3">
                        <div>
                          <p className="font-medium">{term.value}</p>
                          <p className="text-xs text-muted-foreground">Translate this term for each language.</p>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          {translatableLanguages.map((language) => (
                            <div key={`${term.id}-${language.code}`} className="space-y-2">
                              <Label htmlFor={`term-translation-${term.id}-${language.code}`}>
                                {language.name}
                              </Label>
                              <Input
                                id={`term-translation-${term.id}-${language.code}`}
                                value={termTranslations[term.id]?.[language.code] || ''}
                                onChange={(event) =>
                                  setTermTranslations((current) => ({
                                    ...current,
                                    [term.id]: {
                                      ...(current[term.id] || {}),
                                      [language.code]: event.target.value,
                                    },
                                  }))
                                }
                                placeholder={term.value}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
