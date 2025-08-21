import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Database, 
  FileSpreadsheet,
  Download,
  Play,
  Clock,
  TrendingUp,
  Users,
  Calendar
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface IntegrityStatus {
  message: string;
  note: string;
  quickStats: {
    availableYears: string;
    totalTimeLogsInDb: string;
    lastUpdate: string;
  };
}

interface IntegrityReport {
  year: number;
  month: number;
  period: string;
  excelRecords: number;
  dbRecords: number;
  matchedRecords: number;
  integrityPercentage: number;
  duplicatesCount: number;
  duplicatesPercentage: number;
  missingDataCount: number;
  missingDataPercentage: number;
  fieldDiscrepancies: Record<string, number>;
  failureCauses: {
    importErrors: number;
    syncErrors: number;
    structuralGaps: number;
  };
}

interface VerificationSummary {
  totalPeriods: number;
  avgIntegrity: number;
  totalExcelRecords: number;
  totalDbRecords: number;
  totalMatched: number;
  totalDuplicates: number;
  totalMissingData: number;
  byYear: Record<number, {
    periods: number;
    integrity: number;
    records: number;
  }>;
}

export default function IntegrityVerification() {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    summary: VerificationSummary;
    reports: IntegrityReport[];
  } | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current status
  const { data: status, isLoading: statusLoading } = useQuery<IntegrityStatus>({
    queryKey: ['/api/integrity/status'],
    refetchInterval: 30000
  });

  // Verification mutation
  const verifyIntegrityMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/integrity/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    onMutate: () => {
      setIsVerifying(true);
      toast({
        title: "Verifica Integrità Avviata",
        description: "Analisi approfondita dati 2019-2025 in corso..."
      });
    },
    onSuccess: (data: { summary: VerificationSummary; reports: IntegrityReport[] }) => {
      setVerificationResult(data);
      setIsVerifying(false);
      toast({
        title: "Verifica Completata",
        description: `Analizzati ${data.summary.totalPeriods} periodi con ${data.summary.avgIntegrity.toFixed(1)}% integrità media`
      });
    },
    onError: (error: any) => {
      setIsVerifying(false);
      toast({
        title: "Errore Verifica",
        description: error.message || "Errore durante la verifica integrità",
        variant: "destructive"
      });
    }
  });

  const getIntegrityBadgeVariant = (percentage: number) => {
    if (percentage >= 95) return 'default'; // Green
    if (percentage >= 80) return 'secondary'; // Yellow  
    return 'destructive'; // Red
  };

  const getIntegrityIcon = (percentage: number) => {
    if (percentage >= 95) return <CheckCircle className="h-4 w-4" />;
    if (percentage >= 80) return <AlertTriangle className="h-4 w-4" />;
    return <XCircle className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6" data-testid="integrity-verification-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="page-title">
            Verifica Integrità Dati
          </h1>
          <p className="text-muted-foreground">
            Analisi completa integrità database vs file Excel (2019-2025)
          </p>
        </div>
        <Button 
          onClick={() => verifyIntegrityMutation.mutate()}
          disabled={isVerifying}
          size="lg"
          data-testid="button-verify"
          className="gap-2"
        >
          {isVerifying ? (
            <>
              <Clock className="h-4 w-4 animate-spin" />
              Verifica in corso...
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Avvia Verifica Completa
            </>
          )}
        </Button>
      </div>

      {/* Status Overview */}
      <Card data-testid="card-status">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Status Sistema
          </CardTitle>
          <CardDescription>
            Stato attuale del database e ultimo aggiornamento
          </CardDescription>
        </CardHeader>
        <CardContent>
          {statusLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4 animate-spin" />
              Caricamento status...
            </div>
          ) : status ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">Copertura Temporale:</span>
                  <Badge variant="outline">{status.quickStats.availableYears}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-green-500" />
                  <span className="font-medium">Database:</span>
                  <Badge variant="secondary">Attivo</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-purple-500" />
                  <span className="font-medium">Ultimo Check:</span>
                  <span className="text-sm text-muted-foreground">
                    {new Date(status.quickStats.lastUpdate).toLocaleString('it-IT')}
                  </span>
                </div>
              </div>
              
              <Alert data-testid="alert-info">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Informazioni Verifica</AlertTitle>
                <AlertDescription>
                  {status.note}
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <Alert variant="destructive" data-testid="alert-error">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Errore Status</AlertTitle>
              <AlertDescription>
                Impossibile recuperare lo status del sistema
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Verification Results */}
      {verificationResult && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card data-testid="card-summary-integrity">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Integrità Media
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold">
                    {verificationResult.summary.avgIntegrity.toFixed(1)}%
                  </div>
                  {getIntegrityIcon(verificationResult.summary.avgIntegrity)}
                </div>
                <Progress 
                  value={verificationResult.summary.avgIntegrity} 
                  className="mt-2"
                  data-testid="progress-integrity"
                />
              </CardContent>
            </Card>

            <Card data-testid="card-summary-periods">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Periodi Analizzati
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {verificationResult.summary.totalPeriods}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Anni/mesi processati
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-summary-records">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Record Database
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {verificationResult.summary.totalDbRecords.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Su {verificationResult.summary.totalExcelRecords.toLocaleString()} Excel
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-summary-duplicates">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Duplicati Trovati
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {verificationResult.summary.totalDuplicates}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Record duplicati
                </p>
              </CardContent>
            </Card>
          </div>

          {/* By Year Analysis */}
          <Card data-testid="card-by-year">
            <CardHeader>
              <CardTitle>Analisi per Anno</CardTitle>
              <CardDescription>
                Integrità e completezza dati anno per anno
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(verificationResult.summary.byYear)
                  .sort(([a], [b]) => parseInt(a) - parseInt(b))
                  .map(([year, data]) => (
                    <div key={year} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="font-medium">Anno {year}</div>
                        <Badge variant="outline">
                          {data.periods} period{data.periods === 1 ? 'o' : 'i'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {data.records.toLocaleString()} record
                          </div>
                          <div className="text-xs text-muted-foreground">
                            nel database
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="font-medium">
                            {data.integrity.toFixed(1)}%
                          </div>
                          <Badge 
                            variant={getIntegrityBadgeVariant(data.integrity)}
                            data-testid={`badge-year-${year}`}
                          >
                            {getIntegrityIcon(data.integrity)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Detailed Reports Preview */}
          {verificationResult.reports.length > 0 && (
            <Card data-testid="card-detailed-reports">
              <CardHeader>
                <CardTitle>Report Dettagliati (Prime 10 voci)</CardTitle>
                <CardDescription>
                  Analisi specifica per periodo con cause di fallimento
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {verificationResult.reports.map((report, index) => (
                    <div key={`${report.year}-${report.period}`} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">
                          {report.year} - {report.period}
                        </h4>
                        <Badge variant={getIntegrityBadgeVariant(report.integrityPercentage)}>
                          {report.integrityPercentage.toFixed(1)}%
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Excel:</span>
                          <span className="ml-1 font-medium">{report.excelRecords}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">DB:</span>
                          <span className="ml-1 font-medium">{report.dbRecords}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Duplicati:</span>
                          <span className="ml-1 font-medium text-yellow-600">{report.duplicatesCount}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Mancanti:</span>
                          <span className="ml-1 font-medium text-red-600">{report.missingDataCount}</span>
                        </div>
                      </div>

                      {/* Failure Causes */}
                      <div className="flex gap-2 text-xs">
                        <Badge variant="outline" className="text-red-500">
                          Import: {report.failureCauses.importErrors}
                        </Badge>
                        <Badge variant="outline" className="text-yellow-500">
                          Sync: {report.failureCauses.syncErrors}
                        </Badge>
                        <Badge variant="outline" className="text-blue-500">
                          Struttura: {report.failureCauses.structuralGaps}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Help Section */}
      <Card data-testid="card-help">
        <CardHeader>
          <CardTitle>Come Funziona la Verifica</CardTitle>
          <CardDescription>
            Processo di analisi integrità dati basato su ANALISI_CAUSE_FALLIMENTI_2021_2024.md
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-red-600 flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  Errori Import (❌)
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Date malformate</li>
                  <li>• Righe corrutte</li>
                  <li>• Formati inconsistenti</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-yellow-600 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Errori Sync (⚠️)
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Client/staff mancanti</li>
                  <li>• ID non trovati</li>
                  <li>• Matching fallito</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-blue-600 flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Problemi Struttura (🛑)
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Vincoli mancanti</li>
                  <li>• Logica incompleta</li>
                  <li>• Validazione errors</li>
                </ul>
              </div>
            </div>

            <Separator />

            <div className="text-sm text-muted-foreground">
              <p>
                <strong>Tolleranza Temporale:</strong> ±5 minuti per matching orari servizi
              </p>
              <p>
                <strong>Timezone:</strong> Europe/Rome per tutti i calcoli date
              </p>
              <p>
                <strong>Output:</strong> Report salvati in <code>./integrity-reports/</code> (JSON + CSV)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}