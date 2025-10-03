"use client"

import * as React from "react"
import { Info } from "lucide-react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select"
import { Input } from "./input"
import { Label } from "./label"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip"

interface CustomSelectWithInputProps {
  label: string
  tooltipContent: React.ReactNode
  value: string
  onChange: (newValue: string) => void
  options: { value: string; label: string }[]
}

export function CustomSelectWithInput({
  label,
  tooltipContent,
  value,
  onChange,
  options,
}: CustomSelectWithInputProps) {
  const isCustomValue = !options.some(option => option.value === value)
  const [showCustomInput, setShowCustomInput] = React.useState(isCustomValue)

  const handleSelectChange = (selectValue: string) => {
    if (selectValue === "custom") {
      setShowCustomInput(true)
      // Do not call onChange here, wait for user input
    } else {
      setShowCustomInput(false)
      onChange(selectValue)
    }
  }

  const selectValue = isCustomValue ? "custom" : value

  React.useEffect(() => {
    setShowCustomInput(isCustomValue)
  }, [isCustomValue])

  return (
    <div className="space-y-2">
      <div className="flex items-center">
      <Label>{label}</Label>
      <TooltipProvider>
        <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" className="ml-2">
          <Info className="h-4 w-4 text-muted-foreground" />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipContent}</p>
        </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      </div>
      {showCustomInput ? (
      <div className="flex gap-2">
        <div className="flex-1">
        <Select onValueChange={handleSelectChange} value={selectValue}>
          <SelectTrigger>
          <SelectValue placeholder="Select a value" />
          </SelectTrigger>
          <SelectContent>
          {options.map(option => (
            <SelectItem key={option.value} value={option.value}>
            {option.label}
            </SelectItem>
          ))}
          <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
        </div>
        <Input
        className="flex-1"
        value={isCustomValue ? value : ""}
        onChange={e => onChange(e.target.value)}
        placeholder="Enter custom value"
        />
      </div>
      ) : (
      <Select onValueChange={handleSelectChange} value={selectValue}>
        <SelectTrigger>
        <SelectValue placeholder="Select a value" />
        </SelectTrigger>
        <SelectContent>
        {options.map(option => (
          <SelectItem key={option.value} value={option.value}>
          {option.label}
          </SelectItem>
        ))}
        <SelectItem value="custom">Custom</SelectItem>
        </SelectContent>
      </Select>
      )}
    </div>
  )
}