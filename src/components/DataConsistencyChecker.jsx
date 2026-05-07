import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

export default function DataConsistencyChecker({ isOpen, onClose }) {
  const [checking, setChecking] = useState(false);
  const [results, setResults] = useState(null);
  const [fixing, setFixing] = useState(false);
  const { toast } = useToast();

  const runCheck = async () => {
    setChecking(true);
    setResults(null);
    
    try {
      const [participants, queues, services, events] = await Promise.all([
        base44.entities.Participant.list(),
        base44.entities.Queue.list(),
        base44.entities.Service.list(),
        base44.entities.EventSetting.list(),
      ]);

      const event = events[0];
      const checks = {
        participantCount: {
          label: "Total Peserta Terdaftar",
          expected: event?.max_participants || 200,
          actual: participants.length,
          status: "OK",
          issues: [],
        },
        quotaConsistency: {
          label: "Konsistensi Quota Service",
          expected: "Sesuai dengan queue count per quota tier",
          actual: "Checking...",
          status: "OK",
          issues: [],
        },
        queueParticipantMatch: {
          label: "Kecocokan Queue & Participant",
          expected: participants.length * 2, // Setiap peserta = 2 queue (medical + eye)
          actual: queues.length,
          status: "OK",
          issues: [],
        },
        quotaTierConsistency: {
          label: "Konsistensi Quota Tier",
          expected: "FREE_CHECK + PAYMENT = Total Peserta",
          actual: "Checking...",
          status: "OK",
          issues: [],
        },
      };

      // Check 1: Participant quota by category
      const freeCheckCount = participants.filter(p => p.participant_category === "FREE_CHECK").length;
      const paymentCount = participants.filter(p => p.participant_category === "PAYMENT").length;
      const totalByCategory = freeCheckCount + paymentCount;
      
      if (totalByCategory !== participants.length) {
        checks.quotaTierConsistency.status = "ERROR";
        checks.quotaTierConsistency.issues.push(
          `Kategori peserta tidak match: FREE_CHECK=${freeCheckCount}, PAYMENT=${paymentCount}, total=${participants.length}`
        );
      } else {
        checks.quotaTierConsistency.actual = `FREE_CHECK: ${freeCheckCount}, PAYMENT: ${paymentCount}`;
      }

      // Check 2: Service quota consistency
      let quotaIssues = [];
      services.forEach(service => {
        const serviceQueues = queues.filter(q => q.service_id === service.id);
        const fullFreeCount = serviceQueues.filter(q => q.quota_category === "FULL_FREE").length;
        const ccRp1Count = serviceQueues.filter(q => q.quota_category === "CC_RP_1").length;
        const fullPaidCount = serviceQueues.filter(q => q.quota_category === "FULL_PAID").length;

        if (fullFreeCount !== (service.used_full_free || 0)) {
          quotaIssues.push(`${service.service_name}: FULL_FREE queue=${fullFreeCount} vs used=${service.used_full_free}`);
        }
        if (ccRp1Count !== (service.used_cc_rp1 || 0)) {
          quotaIssues.push(`${service.service_name}: CC_RP_1 queue=${ccRp1Count} vs used=${service.used_cc_rp1}`);
        }
        if (fullPaidCount !== (service.used_full_paid || 0)) {
          quotaIssues.push(`${service.service_name}: FULL_PAID queue=${fullPaidCount} vs used=${service.used_full_paid}`);
        }
      });

      if (quotaIssues.length > 0) {
        checks.quotaConsistency.status = "ERROR";
        checks.quotaConsistency.issues = quotaIssues;
        checks.quotaConsistency.actual = `Ditemukan ${quotaIssues.length} ketidaksesuaian`;
      } else {
        checks.quotaConsistency.actual = "Semua service quota konsisten";
      }

      // Check 3: Queue to participant match
      const queueParticipantIds = new Set(queues.map(q => q.participant_id));
      const participantWithQueues = participants.filter(p => queueParticipantIds.has(p.id));
      
      if (participantWithQueues.length !== participants.length) {
        checks.queueParticipantMatch.status = "ERROR";
        checks.queueParticipantMatch.issues.push(
          `${participants.length - participantWithQueues.length} peserta tidak memiliki queue`
        );
      } else if (queues.length !== participants.length * 2) {
        checks.queueParticipantMatch.status = "WARNING";
        checks.queueParticipantMatch.issues.push(
          `Harapan: ${participants.length * 2} queue (medical+eye), actual: ${queues.length}`
        );
      }

      setResults(checks);
      const hasErrors = Object.values(checks).some(c => c.status === "ERROR");
      
      toast({
        title: hasErrors ? "⚠️ Data Inconsistency Found" : "✓ Data Consistency Check OK",
        description: hasErrors 
          ? "Ada ketidaksesuaian data yang perlu diperbaiki"
          : "Semua data sudah konsisten",
        variant: hasErrors ? "destructive" : "default",
      });
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setChecking(false);
    }
  };

  const fixInconsistencies = async () => {
    if (!results) return;
    setFixing(true);

    try {
      // Get all data fresh
      const [participants, queues, services] = await Promise.all([
        base44.entities.Participant.list(),
        base44.entities.Queue.list(),
        base44.entities.Service.list(),
      ]);

      // Recalculate and fix service quotas
      for (const service of services) {
        const serviceQueues = queues.filter(q => q.service_id === service.id);
        const fullFreeCount = serviceQueues.filter(q => q.quota_category === "FULL_FREE").length;
        const ccRp1Count = serviceQueues.filter(q => q.quota_category === "CC_RP_1").length;
        const fullPaidCount = serviceQueues.filter(q => q.quota_category === "FULL_PAID").length;

        await base44.entities.Service.update(service.id, {
          used_full_free: fullFreeCount,
          used_cc_rp1: ccRp1Count,
          used_full_paid: fullPaidCount,
          used_total: fullFreeCount + ccRp1Count + fullPaidCount,
        });
      }

      toast({ title: "✓ Fixed", description: "Semua quota telah disinkronkan ulang" });
      await runCheck(); // Re-check after fix
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setFixing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Data Consistency Checker</DialogTitle>
          <DialogDescription>
            Periksa dan perbaiki ketidaksesuaian data antara peserta, queue, dan quota service
          </DialogDescription>
        </DialogHeader>

        {!results ? (
          <div className="flex justify-center py-8">
            <Button onClick={runCheck} disabled={checking} className="gap-2">
              {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {checking ? "Memeriksa..." : "Mulai Pemeriksaan"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(results).map(([key, check]) => (
              <Card key={key} className={check.status === "ERROR" ? "border-red-200 bg-red-50" : check.status === "WARNING" ? "border-yellow-200 bg-yellow-50" : "border-green-200 bg-green-50"}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    {check.status === "OK" ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${check.status === "ERROR" ? "text-red-600" : "text-yellow-600"}`} />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-semibold text-sm">{check.label}</h4>
                        <Badge variant="outline" className={check.status === "ERROR" ? "bg-red-100 text-red-700 border-red-300" : check.status === "WARNING" ? "bg-yellow-100 text-yellow-700 border-yellow-300" : "bg-green-100 text-green-700 border-green-300"}>
                          {check.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        <span className="font-mono">Expected: {check.expected}</span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        <span className="font-mono">Actual: {check.actual}</span>
                      </p>
                      {check.issues.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {check.issues.map((issue, idx) => (
                            <p key={idx} className="text-xs text-red-700 font-medium">• {issue}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            <div className="flex gap-3 justify-end pt-4">
              <Button variant="outline" onClick={onClose}>
                Tutup
              </Button>
              <Button 
                onClick={fixInconsistencies} 
                disabled={fixing || !Object.values(results).some(c => c.status === "ERROR")}
                className="gap-2"
              >
                {fixing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {fixing ? "Memperbaiki..." : "Perbaiki Ketidaksesuaian"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}