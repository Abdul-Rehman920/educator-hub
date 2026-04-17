import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Wallet, ArrowDownToLine } from "lucide-react";

export default function DashboardWallet() {
  return (
    <DashboardLayout>
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-6">Wallet</h1>

        {/* Balance cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="bg-card rounded-2xl border border-border p-6">
            <p className="text-sm text-muted-foreground mb-1">Available Amount</p>
            <p className="text-3xl font-bold text-foreground">$0.00 <span className="text-base font-normal text-muted-foreground">USD</span></p>
            <Button className="mt-4" size="sm">
              <ArrowDownToLine className="w-4 h-4 mr-2" /> Withdraw
            </Button>
          </div>
          <div className="bg-card rounded-2xl border border-border p-6">
            <p className="text-sm text-muted-foreground mb-1">Pending Amount</p>
            <p className="text-3xl font-bold text-foreground">$0 <span className="text-base font-normal text-muted-foreground">USD</span></p>
          </div>
        </div>

        {/* Transactions table */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold text-foreground">Transaction History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Booking ID</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Details</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Fee</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Amount</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                      <Wallet className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">No transactions yet.</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
