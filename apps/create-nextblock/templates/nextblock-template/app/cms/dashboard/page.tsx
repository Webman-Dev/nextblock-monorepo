import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@nextblock-cms/ui"
import { Calendar, FileText, PenTool, Users, Eye } from "lucide-react"
import { getDashboardStats } from "./actions"

export default async function CmsDashboardPage() {
  const stats = await getDashboardStats();

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
            <div className="text-2xl font-bold">{stats.totalPages}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {/* Trend data would require historical data, keeping static or hiding for now */}
              <span className="text-muted-foreground opacity-50">Total pages on site</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
            <PenTool className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPosts}</div>
             <p className="text-xs text-muted-foreground mt-1">
              <span className="text-muted-foreground opacity-50">Total blog posts</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Page Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div> {/* Placeholder */}
            <p className="text-xs text-muted-foreground mt-1">
               Analytics Integration Coming Soon
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
             <p className="text-xs text-muted-foreground mt-1">
              <span className="text-muted-foreground opacity-50">Registered profiles</span>
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
              {stats.recentContent.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent content found.</p>
              ) : (
                stats.recentContent.map((item, index) => (
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
                        className={`text-xs px-2 py-1 rounded-full ${item.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-700"} dark:bg-opacity-20 uppercase`}
                      >
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
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
              {stats.scheduledContent.length === 0 ? (
                 <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                    <Calendar className="h-8 w-8 mb-2 opacity-20" />
                    <p>No content scheduled.</p>
                 </div>
              ) : (
                stats.scheduledContent.map((item, index) => (
                  <div key={index} className="flex items-start gap-4 pb-4 border-b last:border-0 last:pb-0">
                    <div className="w-10 h-10 rounded bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center text-center">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium">{item.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-muted-foreground">{item.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {item.type}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics chart */}
      <Card>
        <CardHeader>
          <CardTitle>Traffic Overview</CardTitle>
          <CardDescription>Page views over the last 30 days (Mock Data)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-end gap-2 align-bottom">
             {/* Mock chart bars */}
             {[20, 45, 30, 80, 55, 40, 60, 30, 70, 45, 25, 65, 50, 40].map((h, i) => (
                <div key={i} className="flex-1 bg-primary/20 hover:bg-primary/40 transition-colors rounded-t-sm relative group" style={{ height: `${h}%` }}>
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        {h * 10} views
                    </div>
                </div>
             ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
