import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Loader2, Play, StepForward, RefreshCw } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

const TEST_STEPS = [
  { id: 1, label: "Daftar Peserta", description: "Membuat peserta baru dan antrian" },
  { id: 2, label: "Panggil Peserta", description: "Status WAITING → CALLED" },
  { id: 3, label: "Mulai Layanan", description: "Status CALLED → SERVING" },
  { id: 4, label: "Selesaikan Layanan", description: "Status SERVING → DONE" },
  { id: 5, label: "Peserta Selesai", description: "Proses registrasi lengkap" },
];

export default function TestFlowWizard({ isOpen, onClose }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [testData, setTestData] = useState(null);
  const [completedSteps, setCompletedSteps] = useState([]);
  const { toast } = useToast();

  const handleRunTest = async () => {
    setLoading(true);
    try {
      // Step 1: Get first service for registration
      const services = await base44.entities.Service.list();
      const medicalService = services.find(s => s.service_group === "MEDICAL");
      const eyeService = services.find(s => s.service_group === "EYE_CHECK");

      if (!medicalService || !eyeService) {
        toast({ title: "Error", description: "Layanan tidak ditemukan", variant: "destructive" });
        setLoading(false);
        return;
      }

      // Create test participant
      const participants = await base44.entities.Participant.list();
      const testNumber = Math.floor(Math.random() * 10000);
      const participant = await base44.entities.Participant.create({
        registration_number: `TEST-${testNumber}`,
        full_name: `Test User ${testNumber}`,
        phone_number: "081234567890",
        unit_division: "QA Team",
        participant_category: "FREE_CHECK",
        medical_service_id: medicalService.id,
        eye_service_id: eyeService.id,
        payment_status: "NOT_REQUIRED",
        participant_status: "REGISTERED",
        registered_by: (await base44.auth.me())?.email,
        registered_at: new Date().toISOString(),
      });

      setTestData({ participant, medicalService, eyeService, queues: [] });
      setCompletedSteps([1]);
      setCurrentStep(1);

      // Create queues
      const medicalQueue = await base44.entities.Queue.create({
        participant_id: participant.id,
        service_id: medicalService.id,
        queue_number: `${medicalService.service_code}001`,
        queue_sequence: 1,
        quota_category: "FULL_FREE",
        payment_display_status: "FREE",
        status: "WAITING",
        qr_token: "test-token-" + Date.now(),
        qr_code_url: "",
        qr_verification_status: "NOT_SCANNED",
      });

      const eyeQueue = await base44.entities.Queue.create({
        participant_id: participant.id,
        service_id: eyeService.id,
        queue_number: `${eyeService.service_code}001`,
        queue_sequence: 1,
        quota_category: "FULL_FREE",
        payment_display_status: "FREE",
        status: "WAITING",
        qr_token: "test-token-" + Date.now(),
        qr_code_url: "",
        qr_verification_status: "NOT_SCANNED",
      });

      setTestData(prev => ({ ...prev, queues: [medicalQueue, eyeQueue] }));

      toast({
        title: "✓ Step 1 Complete",
        description: `Peserta ${participant.full_name} terdaftar dengan antrian ${medicalQueue.queue_number} & ${eyeQueue.queue_number}`,
      });
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleNextStep = async () => {
    if (!testData?.queues?.length) return;
    setLoading(true);

    try {
      const medQueue = testData.queues[0];
      const eyeQueue = testData.queues[1];

      if (currentStep === 1) {
        // WAITING → CALLED
        await base44.entities.Queue.update(medQueue.id, { status: "CALLED", called_at: new Date().toISOString() });
        await base44.entities.Queue.update(eyeQueue.id, { status: "CALLED", called_at: new Date().toISOString() });
        setCompletedSteps([...completedSteps, 2]);
        setCurrentStep(2);
        toast({ title: "✓ Step 2 Complete", description: "Peserta dipanggil ke booth" });
      } else if (currentStep === 2) {
        // CALLED → SERVING
        await base44.entities.Queue.update(medQueue.id, { status: "SERVING", serving_at: new Date().toISOString() });
        setCompletedSteps([...completedSteps, 3]);
        setCurrentStep(3);
        toast({ title: "✓ Step 3 Complete", description: "Layanan medis dimulai" });
      } else if (currentStep === 3) {
        // SERVING → DONE (medical)
        await base44.entities.Queue.update(medQueue.id, { status: "DONE", done_at: new Date().toISOString() });
        setCompletedSteps([...completedSteps, 4]);
        setCurrentStep(4);
        toast({ title: "✓ Step 4 Complete", description: "Layanan medis selesai" });
      } else if (currentStep === 4) {
        // Complete eye service and update participant
        await base44.entities.Queue.update(eyeQueue.id, { status: "DONE", done_at: new Date().toISOString() });
        await base44.entities.Participant.update(testData.participant.id, {
          participant_status: "COMPLETED",
        });
        setCompletedSteps([...completedSteps, 5]);
        setCurrentStep(5);
        toast({ title: "✓ Test Flow Complete!", description: "Peserta berhasil menyelesaikan semua layanan" });
      }
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCurrentStep(0);
    setTestData(null);
    setCompletedSteps([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Test Flow Registrasi → Selesai</DialogTitle>
          <DialogDescription>
            Jalankan flow lengkap peserta dari registrasi hingga selesai melayani
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Steps Timeline */}
          <div className="space-y-3">
            {TEST_STEPS.map((step, idx) => (
              <div key={step.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                      completedSteps.includes(step.id)
                        ? "bg-green-500 text-white"
                        : currentStep === step.id
                        ? "bg-primary text-white ring-2 ring-primary/30"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {completedSteps.includes(step.id) ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      step.id
                    )}
                  </div>
                  {idx < TEST_STEPS.length - 1 && (
                    <div
                      className={`w-0.5 h-8 mt-1 ${
                        completedSteps.includes(step.id) ? "bg-green-500" : "bg-border"
                      }`}
                    />
                  )}
                </div>
                <div className="flex-1 pt-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-sm">{step.label}</h4>
                    {completedSteps.includes(step.id) && <Badge variant="outline" className="text-green-600 border-green-200">Selesai</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Test Data Display */}
          {testData && (
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Peserta</p>
                    <p className="font-mono font-bold">{testData.participant.full_name}</p>
                    <p className="text-xs text-muted-foreground">{testData.participant.registration_number}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Antrian</p>
                    <p className="font-mono font-bold">{testData.queues[0]?.queue_number || "—"}</p>
                    <p className="text-xs text-muted-foreground">Status: {testData.queues[0]?.status || "—"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={handleReset}>
              <RefreshCw className="w-4 h-4 mr-2" /> Reset
            </Button>
            {currentStep === 0 ? (
              <Button onClick={handleRunTest} disabled={loading} className="gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Mulai Test Flow
              </Button>
            ) : currentStep < 5 ? (
              <Button onClick={handleNextStep} disabled={loading} className="gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <StepForward className="w-4 h-4" />}
                Lanjut ke Step {currentStep + 1}
              </Button>
            ) : (
              <Button onClick={onClose} className="gap-2">
                <CheckCircle2 className="w-4 h-4" /> Selesai
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}