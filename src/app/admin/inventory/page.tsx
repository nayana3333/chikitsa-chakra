import { Boxes, TriangleAlert } from "lucide-react";
import { requireRole } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { PageHeader, StatCard, EmptyState, Table, THead, TH, TR, TD } from "@/components/ui/page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/misc";
import { formatCurrency, formatDate, formatRelative, humanise } from "@/lib/utils";

export const metadata = { title: "Inventory" };

export default async function AdminInventory() {
  await requireRole("ADMIN");

  const items = await db.inventoryItem.findMany({
    orderBy: { name: "asc" },
    include: { batches: { orderBy: { expiryDate: "asc" } } },
  });

  const now = new Date();
  const soon = new Date(now.getTime() + 45 * 86400000);

  const rows = items.map((item) => {
    const onHand = item.batches.reduce((s, b) => s + Number(b.quantity), 0);
    const reorder = Number(item.reorderLevel);
    const expiring = item.batches.filter((b) => b.expiryDate <= soon);
    const expired = item.batches.filter((b) => b.expiryDate < now);
    return { item, onHand, reorder, expiring, expired, value: onHand * Number(item.unitCost) };
  });

  const lowCount = rows.filter((r) => r.onHand < r.reorder).length;
  const expiringCount = rows.reduce((s, r) => s + r.expiring.length, 0);
  const totalValue = rows.reduce((s, r) => s + r.value, 0);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Inventory"
        description="Medicated oils, herbs and consumables, tracked by batch so expiry is visible before a batch reaches a patient."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Items tracked" value={items.length} icon={Boxes} />
        <StatCard
          label="Below reorder level"
          value={lowCount}
          icon={TriangleAlert}
          tone={lowCount > 0 ? "destructive" : "success"}
        />
        <StatCard
          label="Batches expiring"
          value={expiringCount}
          hint="Within 45 days"
          icon={TriangleAlert}
          tone={expiringCount > 0 ? "warning" : "success"}
        />
        <StatCard label="Stock value" value={formatCurrency(totalValue)} icon={Boxes} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stock on hand</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {rows.length === 0 ? (
            <div className="px-5">
              <EmptyState icon={Boxes} title="No inventory items" />
            </div>
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Item</TH>
                  <TH>Category</TH>
                  <TH>On hand</TH>
                  <TH>Earliest expiry</TH>
                  <TH className="text-right">Value</TH>
                </tr>
              </THead>
              <tbody>
                {rows.map(({ item, onHand, reorder, expiring, value }) => {
                  const isLow = onHand < reorder;
                  // Cap the bar at 100% — twice the reorder level is a full bar.
                  const fill = Math.min(100, Math.round((onHand / (reorder * 2)) * 100));
                  const earliest = item.batches[0];

                  return (
                    <TR key={item.id}>
                      <TD>
                        <p className="font-medium">{item.name}</p>
                        <div className="mt-1.5 w-36">
                          <Progress
                            value={fill}
                            indicatorClassName={isLow ? "bg-destructive" : undefined}
                          />
                        </div>
                      </TD>
                      <TD>
                        <Badge variant="secondary">{humanise(item.category)}</Badge>
                      </TD>
                      <TD>
                        <span className="tabular-nums">
                          {onHand.toLocaleString("en-IN")} {item.unit}
                        </span>
                        {isLow && (
                          <Badge variant="destructive" className="ml-2">
                            Low
                          </Badge>
                        )}
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Reorder at {reorder.toLocaleString("en-IN")}
                        </p>
                      </TD>
                      <TD>
                        {earliest ? (
                          <>
                            <p className="text-sm">{formatDate(earliest.expiryDate)}</p>
                            <p className="text-xs text-muted-foreground">
                              Batch {earliest.batchNo} · {formatRelative(earliest.expiryDate)}
                            </p>
                            {expiring.length > 0 && (
                              <Badge variant="warning" className="mt-1">
                                {expiring.length} expiring
                              </Badge>
                            )}
                          </>
                        ) : (
                          <span className="text-muted-foreground">No batches</span>
                        )}
                      </TD>
                      <TD className="text-right tabular-nums">
                        {formatCurrency(value)}
                      </TD>
                    </TR>
                  );
                })}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
