'use client';

import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from '@nextblock-cms/ui';
import { Button } from '@nextblock-cms/ui';
import { Input } from '@nextblock-cms/ui';
import { Label } from '@nextblock-cms/ui';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@nextblock-cms/ui';
import { Download, FileDown, Loader2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { fetchOrderReportData, ReportType } from './export-actions';
import { 
  generateCSV,
  mapGeneralSalesLedger,
  mapTaxLiabilitySummary, 
  mapMultiCurrencyRevenue 
} from '../../../export-helpers';

export function ExportReportsDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportType, setReportType] = useState<ReportType>('general_ledger');

  const handleDownload = async () => {
    if (!startDate || !endDate) {
      toast.error('Please select both start and end dates');
      return;
    }

    setLoading(true);
    try {
      toast.info('Generating report...');
      const data = await fetchOrderReportData(startDate, endDate);

      if (!data || data.length === 0) {
        toast.error('No orders found for the selected date range');
        setLoading(false);
        return;
      }

      let mappedData: any[] = [];
      const filename = `report_${reportType}_${startDate}_to_${endDate}`;

      switch (reportType) {
        case 'general_ledger':
          mappedData = mapGeneralSalesLedger(data as any);
          break;
        case 'tax_liability':
          mappedData = mapTaxLiabilitySummary(data as any);
          break;
        case 'currency_summary':
          mappedData = mapMultiCurrencyRevenue(data as any);
          break;
      }

      generateCSV(mappedData, `${filename}.csv`);

      toast.success('Download complete!');
      setOpen(false);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export Reports
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5 text-blue-600" />
            Accounting Reports
          </DialogTitle>
          <DialogDescription>
            Generate and download accountant-friendly order reports.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="start-date" className="text-xs font-semibold uppercase text-gray-500 tracking-wider">
                Start Date
              </Label>
              <div className="relative">
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="pl-8"
                />
                <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="end-date" className="text-xs font-semibold uppercase text-gray-500 tracking-wider">
                End Date
              </Label>
              <div className="relative">
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="pl-8"
                />
                <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="report-type" className="text-xs font-semibold uppercase text-gray-500 tracking-wider">
              Report Type
            </Label>
            <Select 
              value={reportType} 
              onValueChange={(value) => setReportType(value as ReportType)}
            >
              <SelectTrigger id="report-type" className="w-full">
                <SelectValue placeholder="Select report type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general_ledger">General Sales Ledger</SelectItem>
                <SelectItem value="tax_liability">Tax Liability Summary</SelectItem>
                <SelectItem value="currency_summary">Multi-Currency Revenue Summary</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button 
            onClick={handleDownload} 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Download Report
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
