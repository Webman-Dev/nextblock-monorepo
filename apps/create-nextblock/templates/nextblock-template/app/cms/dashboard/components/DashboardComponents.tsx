import React from 'react'
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle, 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  Badge, Button
} from "@nextblock-cms/ui"
import { 
  ShoppingCart, 
  Zap, Sparkles, ArrowRight, 
  Globe, CreditCard
} from "lucide-react"
import { formatPrice } from "@nextblock-cms/utils"
import Link from "next/link"

interface MetricCardProps {
  title: string
  value: string | number
  description?: string
  icon: React.ElementType
  trend?: {
    value: string
    positive?: boolean
  }
  className?: string
}

export function MetricCard({ title, value, description, icon: Icon, trend, className }: MetricCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {(description || trend) && (
          <div className="flex items-center gap-2 mt-1">
            {trend && (
              <span className={`text-xs font-medium ${trend.positive ? 'text-emerald-600' : 'text-rose-600'}`}>
                {trend.value}
              </span>
            )}
            {description && (
              <p className="text-xs text-muted-foreground opacity-70">
                {description}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface SalesLedgerProps {
  sales: any[]
}

export function SalesLedger({ sales }: SalesLedgerProps) {
  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Recent Sales Ledger</CardTitle>
          <CardDescription>Last 10 transactions from Stripe and Freemius</CardDescription>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/cms/orders">View All</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No recent transactions found.
                  </TableCell>
                </TableRow>
              ) : (
                sales.map((sale) => {
                  const customerName = sale.profiles?.full_name || sale.customer_details?.name || sale.customer_details?.email || 'Guest'
                  const isPhysical = sale.provider === 'stripe'
                  
                  return (
                    <TableRow key={sale.id} className="group">
                      <TableCell className="align-middle">
                        <div className="font-medium">{customerName}</div>
                        <div className="text-xs text-muted-foreground hidden group-hover:block font-mono">
                          {sale.id.slice(0, 8)}...
                        </div>
                      </TableCell>
                      <TableCell className="align-middle">
                        <Badge 
                          variant="outline" 
                          className={`capitalize text-[10px] px-1.5 py-0 ${
                            sale.status === 'paid' 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' 
                              : sale.status === 'trial'
                                ? 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/20 dark:text-cyan-300 dark:border-cyan-800'
                                : 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700'
                          }`}
                        >
                          {sale.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="align-middle">
                        <div className="flex items-center gap-1.5">
                          {isPhysical ? (
                            <CreditCard className="h-3 w-3 text-blue-500" />
                          ) : (
                            <Globe className="h-3 w-3 text-purple-500" />
                          )}
                          <span className="text-xs capitalize">{isPhysical ? 'Physical' : 'Digital'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="align-middle text-right font-medium">
                        {formatPrice(sale.total, sale.currency)}
                      </TableCell>
                      <TableCell className="align-middle text-right text-muted-foreground text-xs">
                        {new Date(sale.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

interface PremiumCTAProps {
  hasCommerce?: boolean
  hasAi?: boolean
}

export function PremiumCTA({ hasCommerce, hasAi }: PremiumCTAProps) {
  if (hasCommerce && hasAi) return null

  return (
    <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-white to-slate-50 dark:from-slate-950 dark:to-slate-900">
      <CardHeader className="pb-2">
        <div className="w-fit rounded-lg bg-primary/10 p-2 mb-2">
          <Zap className="h-5 w-5 text-primary" />
        </div>
        <CardTitle className="text-xl">Upgrade to Premium</CardTitle>
        <CardDescription>
          Unlock the full power of NextBlock™ with advanced capabilities.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-2">
        <div className="grid gap-4">
          {!hasCommerce && (
            <div className="flex items-start gap-3">
              <div className="mt-1 rounded-full bg-emerald-100 p-1 dark:bg-emerald-900/30">
                <ShoppingCart className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h4 className="text-sm font-semibold">Commerce Pro</h4>
                <p className="text-xs text-muted-foreground">Stripe/Freemius integration, multi-currency, and auto-tax sync.</p>
              </div>
            </div>
          )}
          
          {!hasAi && (
            <div className="flex items-start gap-3">
              <div className="mt-1 rounded-full bg-purple-100 p-1 dark:bg-purple-900/30">
                <Sparkles className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h4 className="text-sm font-semibold">AI Intelligence</h4>
                <p className="text-xs text-muted-foreground">Bring your own OpenRouter keys. Native JSONB block generation.</p>
              </div>
            </div>
          )}
        </div>

        <Button className="w-full shadow-lg shadow-primary/20 group" asChild>
          <a href="https://nextblock.dev" target="_blank" rel="noopener noreferrer">
            Get Started
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </a>
        </Button>
      </CardContent>
    </Card>
  )
}
