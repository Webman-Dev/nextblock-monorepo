import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@nextblock-monorepo/ui"
import { Calendar, FileText, PenTool, Users, ArrowUpRight, ArrowDownRight, Eye } from "lucide-react"

export default function CmsDashboardPage() {
  return (
    <div className="w-full space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-2">Welcome to the CMS Dashboard</h2>
        <p className="text-muted-foreground">Manage your content and monitor site performance from one place.</p>
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Pages</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-emerald-500 font-medium inline-flex items-center">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                12%
              </span>{" "}
              from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
            <PenTool className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">142</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-emerald-500 font-medium inline-flex items-center">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                8%
              </span>{" "}
              from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Page Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8,623</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-emerald-500 font-medium inline-flex items-center">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                24%
              </span>{" "}
              from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">573</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-red-500 font-medium inline-flex items-center">
                <ArrowDownRight className="h-3 w-3 mr-1" />
                3%
              </span>{" "}
              from last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent activity and analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Recent Content</CardTitle>
            <CardDescription>Latest content updates across your site</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentContent.map((item, index) => (
                <div key={index} className="flex items-start gap-4 pb-4 border-b last:border-0 last:pb-0">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${item.type === "page" ? "bg-blue-100 text-blue-600" : "bg-amber-100 text-amber-600"} dark:bg-opacity-20`}
                  >
                    {item.type === "page" ? <FileText className="h-4 w-4" /> : <PenTool className="h-4 w-4" />}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium">{item.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-muted-foreground">{item.author}</p>
                      <span className="text-xs text-muted-foreground">•</span>
                      <p className="text-xs text-muted-foreground">{item.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${item.status === "Published" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"} dark:bg-opacity-20`}
                    >
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Upcoming Schedule</CardTitle>
            <CardDescription>Content scheduled for publication</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {scheduledContent.map((item, index) => (
                <div key={index} className="flex items-start gap-4 pb-4 border-b last:border-0 last:pb-0">
                  <div className="w-10 h-10 rounded bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center text-center">
                    <span className="text-xs font-medium">{item.month}</span>
                    <span className="text-sm font-bold">{item.day}</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium">{item.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">{item.time}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {item.type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics chart */}
      <Card>
        <CardHeader>
          <CardTitle>Traffic Overview</CardTitle>
          <CardDescription>Page views over the last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-end gap-2">
            {analyticsData.map((item, index) => (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-primary/10 dark:bg-primary/20 rounded-sm"
                  style={{ height: `${item.value}%` }}
                ></div>
                <span className="text-xs text-muted-foreground mt-2">{item.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Sample data
const recentContent = [
  {
    title: "Homepage Redesign",
    type: "page",
    author: "John Smith",
    date: "Today, 2:30 PM",
    status: "Published",
  },
  {
    title: "New Product Launch",
    type: "post",
    author: "Sarah Johnson",
    date: "Yesterday, 10:15 AM",
    status: "Published",
  },
  {
    title: "Q2 Marketing Strategy",
    type: "post",
    author: "Michael Brown",
    date: "May 12, 2023",
    status: "Draft",
  },
  {
    title: "About Us Page",
    type: "page",
    author: "John Smith",
    date: "May 10, 2023",
    status: "Published",
  },
]

const scheduledContent = [
  {
    title: "Summer Sale Announcement",
    month: "May",
    day: "20",
    time: "9:00 AM",
    type: "Post",
  },
  {
    title: "New Feature Release",
    month: "May",
    day: "22",
    time: "12:00 PM",
    type: "Page",
  },
  {
    title: "Customer Testimonials",
    month: "May",
    day: "25",
    time: "3:30 PM",
    type: "Post",
  },
  {
    title: "Team Page Update",
    month: "May",
    day: "28",
    time: "10:00 AM",
    type: "Page",
  },
]

const analyticsData = [
  { label: "1", value: 20 },
  { label: "5", value: 40 },
  { label: "10", value: 35 },
  { label: "15", value: 50 },
  { label: "20", value: 30 },
  { label: "25", value: 80 },
  { label: "30", value: 60 },
]
