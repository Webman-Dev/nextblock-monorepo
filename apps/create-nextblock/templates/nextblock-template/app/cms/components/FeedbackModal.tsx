"use client"

import { useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { usePathname } from "next/navigation"
import { toast } from "react-hot-toast"
import { submitFeedback } from "@/app/actions/feedback"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  Button,
  Textarea,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@nextblock-cms/ui"
import { MessageSquarePlus, Loader2 } from "lucide-react"
import { cn } from "@nextblock-cms/utils"

interface FeedbackModalProps {
  sidebarOpen?: boolean
}

export function FeedbackModal({ sidebarOpen = true }: FeedbackModalProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [subject, setSubject] = useState("suggestion")
  const [message, setMessage] = useState("")
  const { user, profile } = useAuth()
  const pathname = usePathname()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) {
      toast.error("Please enter a message")
      return
    }

    setLoading(true)
    try {
      const result = await submitFeedback({
        subject,
        message,
        userEmail: user?.email || "unknown@example.com",
        userName: profile?.full_name || user?.email || "Unknown",
        url: pathname,
      })

      if (result.success) {
        toast.success("Feedback sent! Thank you.")
        setOpen(false)
        setMessage("")
        setSubject("suggestion")
      } else {
        toast.error("Failed to send feedback. Please try again.")
      }
    } catch (error) {
      console.error(error)
      toast.error("An error occurred.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all w-full text-left",
            "text-slate-600 hover:text-primary hover:bg-primary/5 dark:text-slate-300 dark:hover:bg-primary/10"
          )}
        >
          <MessageSquarePlus className="h-5 w-5" />
          {sidebarOpen && <span>Feedback</span>}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Send Feedback</DialogTitle>
          <DialogDescription>
            Help us improve the CMS. Report bugs or suggest features.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="subject" className="text-right">
              Type
            </Label>
            <div className="col-span-3">
               <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="suggestion">Suggestion</SelectItem>
                  <SelectItem value="bug">Bug Report</SelectItem>
                  <SelectItem value="feature">Feature Request</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="message" className="text-right pt-2">
              Message
            </Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us what you think..."
              className="col-span-3 min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Feedback
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
