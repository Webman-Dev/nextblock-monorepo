"use client";

import React, { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { handleFormSubmission } from '@/app/actions/formActions';
import type { FormBlockContent, FormField } from '@/lib/blocks/blockRegistry';
import { Input } from '@nextblock-cms/ui';
import { Textarea } from '@nextblock-cms/ui';
import { Label } from '@nextblock-cms/ui';
import { Button } from '@nextblock-cms/ui';
import { Checkbox } from '@nextblock-cms/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@nextblock-cms/ui';

interface FormBlockRendererProps {
  content: FormBlockContent;
  languageId: number;
}

function SubmitButton({ text }: { text: string }) {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? 'Submitting...' : text}</Button>;
}

const FormBlockRenderer: React.FC<FormBlockRendererProps> = ({ content }) => {
  const [state, formAction] = useActionState(handleFormSubmission.bind(null, content.recipient_email), {
    success: false,
    message: '',
  });

  if (state.success) {
    return <div className="p-4 rounded-md bg-green-100 text-green-800">{content.success_message}</div>;
  }

  return (
    <form action={formAction} className="space-y-4 my-6 container mx-auto">
      {content.fields.map((field: FormField) => (
        <div key={field.temp_id} className="space-y-2">
          <Label htmlFor={field.temp_id}>
            {field.label} {field.is_required && <span className="text-red-500">*</span>}
          </Label>
          {renderField(field)}
        </div>
      ))}
      {state.message && !state.success && (
          <p className="text-sm text-red-600">{state.message}</p>
      )}
      <SubmitButton text={content.submit_button_text} />
    </form>
  );
};

const renderField = (field: FormField) => {
    const commonProps = {
        id: field.temp_id,
        name: field.label.toLowerCase().replace(/\s+/g, '_'),
        placeholder: field.placeholder || '',
        required: field.is_required,
    };

    switch (field.field_type) {
        case 'textarea':
            return <Textarea {...commonProps} />;
        case 'select':
            return (
                <Select name={commonProps.name} required={field.is_required}>
                    <SelectTrigger id={commonProps.id}><SelectValue placeholder={field.placeholder || 'Select an option'} /></SelectTrigger>
                    <SelectContent>
                        {field.options?.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                    </SelectContent>
                </Select>
            );
        case 'radio':
            return (
                <div className="space-y-2">
                    {field.options?.map(opt => (
                        <div key={opt.value} className="flex items-center gap-2">
                            <input type="radio" id={`${commonProps.id}-${opt.value}`} name={commonProps.name} value={opt.value} required={field.is_required} className="h-4 w-4"/>
                            <Label htmlFor={`${commonProps.id}-${opt.value}`}>{opt.label}</Label>
                        </div>
                    ))}
                </div>
            );
        case 'checkbox':
             return (
                <div className="flex items-center gap-2">
                    <Checkbox id={commonProps.id} name={commonProps.name} required={field.is_required} />
                    <Label htmlFor={commonProps.id} className="font-normal">{field.placeholder || "I agree"}</Label>
                </div>
             );
        case 'email':
            return <Input type="email" {...commonProps} />;
        case 'text':
        default:
            return <Input type="text" {...commonProps} />;
    }
};

export default FormBlockRenderer;