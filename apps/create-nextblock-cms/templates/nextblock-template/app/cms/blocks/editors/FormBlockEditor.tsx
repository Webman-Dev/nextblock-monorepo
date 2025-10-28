"use client";

import React, { useState } from 'react';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, PlusCircle, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@nextblock-cms/ui';
import { Input } from '@nextblock-cms/ui';
import { Label } from '@nextblock-cms/ui';
import { Checkbox } from '@nextblock-cms/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@nextblock-cms/ui';
import { BlockEditorProps } from '@/app/cms/blocks/components/BlockEditorModal';
import type { FormBlockContent, FormField, FormFieldOption } from '@/lib/blocks/blockRegistry';

// Sub-component for a single editable form field in the editor
const SortableFormField = ({ field, index, onUpdate, onDelete }: { field: FormField, index: number, onUpdate: (index: number, field: FormField) => void, onDelete: (index: number) => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: field.temp_id });
  const [isExpanded, setIsExpanded] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleFieldChange = (prop: keyof FormField, value: unknown) => {
    onUpdate(index, { ...field, [prop]: value });
  };

  const handleOptionChange = (optionIndex: number, prop: keyof FormFieldOption, value: string) => {
    const newOptions = [...(field.options || [])];
    newOptions[optionIndex] = { ...newOptions[optionIndex], [prop]: value };
    handleFieldChange('options', newOptions);
  };

  const addOption = () => {
    const newOptions = [...(field.options || []), { label: `Option ${ (field.options?.length || 0) + 1}`, value: `option-${ (field.options?.length || 0) + 1}` }];
    handleFieldChange('options', newOptions);
  };

  const removeOption = (optionIndex: number) => {
    const newOptions = field.options?.filter((_, i) => i !== optionIndex);
    handleFieldChange('options', newOptions);
  };

  return (
    <div ref={setNodeRef} style={style} className="p-3 border rounded bg-background shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" {...attributes} {...listeners} className="cursor-grab p-1"><GripVertical className="h-4 w-4" /></Button>
          <span className="font-medium text-sm">{field.label || `Field ${index + 1}`} ({field.field_type})</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)} className="h-8 w-8">{isExpanded ? <ChevronUp/> : <ChevronDown/>}</Button>
          <Button variant="destructive" size="icon" onClick={() => onDelete(index)} className="h-8 w-8"><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>
      {isExpanded && (
        <div className="mt-4 space-y-4 p-3 border-t">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Field Type</Label>
              <Select value={field.field_type} onValueChange={(value) => handleFieldChange('field_type', value)}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="textarea">Text Area</SelectItem>
                  <SelectItem value="select">Select</SelectItem>
                  <SelectItem value="radio">Radio Buttons</SelectItem>
                  <SelectItem value="checkbox">Checkbox</SelectItem>
                </SelectContent>
              </Select>
            </div>
             <div>
                <Label>Label</Label>
                <Input value={field.label} onChange={(e) => handleFieldChange('label', e.target.value)} />
             </div>
          </div>
           <div>
              <Label>Placeholder</Label>
              <Input value={field.placeholder || ''} onChange={(e) => handleFieldChange('placeholder', e.target.value)} />
           </div>
          <div className="flex items-center gap-2">
            <Checkbox id={`required-${field.temp_id}`} checked={field.is_required} onCheckedChange={(checked) => handleFieldChange('is_required', checked)} />
            <Label htmlFor={`required-${field.temp_id}`}>Required</Label>
          </div>
          {(field.field_type === 'select' || field.field_type === 'radio') && (
            <div className="space-y-2">
              <Label>Options</Label>
              {field.options?.map((option, optIndex) => (
                <div key={optIndex} className="flex items-center gap-2">
                  <Input value={option.label} placeholder="Label" onChange={(e) => handleOptionChange(optIndex, 'label', e.target.value)} />
                  <Input value={option.value} placeholder="Value" onChange={(e) => handleOptionChange(optIndex, 'value', e.target.value)} />
                  <Button variant="ghost" size="icon" onClick={() => removeOption(optIndex)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addOption}><PlusCircle className="h-4 w-4 mr-2" />Add Option</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default function FormBlockEditor({ content, onChange }: BlockEditorProps<Partial<FormBlockContent>>) {
  const [fields, setFields] = useState<FormField[]>(content.fields || []);

  const handleMainSettingChange = (prop: keyof FormBlockContent, value: string) => {
    onChange({ ...content, fields, [prop]: value });
  };

  const addNewField = () => {
    const newField: FormField = {
      temp_id: `field-${Date.now()}`,
      field_type: 'text',
      label: `New Field ${fields.length + 1}`,
      is_required: false,
    };
    const newFields = [...fields, newField];
    setFields(newFields);
    onChange({ ...content, fields: newFields });
  };

  const updateField = (index: number, updatedField: FormField) => {
    const newFields = [...fields];
    newFields[index] = updatedField;
    setFields(newFields);
    onChange({ ...content, fields: newFields });
  };

  const deleteField = (index: number) => {
    const newFields = fields.filter((_, i) => i !== index);
    setFields(newFields);
    onChange({ ...content, fields: newFields });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex(f => f.temp_id === active.id);
      const newIndex = fields.findIndex(f => f.temp_id === over.id);
      const newFields = arrayMove(fields, oldIndex, newIndex);
      setFields(newFields);
      onChange({ ...content, fields: newFields });
    }
  };

  return (
    <div className="space-y-6 p-4 border-t mt-2">
        <h3 className="text-lg font-medium">Form Settings</h3>
        <div className="space-y-4 p-3 border rounded">
             <div>
                <Label>Recipient Email</Label>
                <Input value={content.recipient_email || ''} onChange={(e) => handleMainSettingChange('recipient_email', e.target.value)} placeholder="submissions@example.com"/>
                <p className="text-xs text-muted-foreground mt-1">The address where form submissions will be sent.</p>
             </div>
              <div>
                <Label>Submit Button Text</Label>
                <Input value={content.submit_button_text || ''} onChange={(e) => handleMainSettingChange('submit_button_text', e.target.value)} />
             </div>
              <div>
                <Label>Success Message</Label>
                <Input value={content.success_message || ''} onChange={(e) => handleMainSettingChange('success_message', e.target.value)} />
             </div>
        </div>

        <h3 className="text-lg font-medium">Form Fields</h3>
         <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={fields.map(f => f.temp_id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {fields.map((field, index) => (
                  <SortableFormField key={field.temp_id} index={index} field={field} onUpdate={updateField} onDelete={deleteField} />
                ))}
              </div>
            </SortableContext>
         </DndContext>
        <Button variant="outline" onClick={addNewField}><PlusCircle className="h-4 w-4 mr-2" />Add Field</Button>
    </div>
  );
}