import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, Font } from '@react-pdf/renderer';
import type { StaffCompensation } from '@shared/schema';

// Register fonts
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/npm/@canvas-fonts/helvetica@1.0.4/Helvetica.ttf' },
    { src: 'https://cdn.jsdelivr.net/npm/@canvas-fonts/helvetica@1.0.4/Helvetica-Bold.ttf', fontWeight: 'bold' }
  ]
});

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 11,
  },
  header: {
    marginBottom: 30,
    borderBottom: '2pt solid #2563eb',
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1e293b',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 5,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#334155',
    borderBottom: '1pt solid #e2e8f0',
    paddingBottom: 5,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  label: {
    width: '40%',
    fontSize: 11,
    color: '#64748b',
  },
  value: {
    flex: 1,
    fontSize: 11,
    color: '#1e293b',
    fontWeight: 'bold',
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    padding: 8,
    borderRadius: 4,
  },
  tableHeaderCell: {
    flex: 1,
    fontSize: 10,
    fontWeight: 'bold',
    color: '#475569',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottom: '1pt solid #e2e8f0',
  },
  tableCell: {
    flex: 1,
    fontSize: 10,
    color: '#334155',
  },
  totalSection: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    border: '1pt solid #fbbf24',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  totalLabel: {
    fontSize: 12,
    color: '#92400e',
  },
  totalValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#92400e',
  },
  footer: {
    marginTop: 40,
    paddingTop: 20,
    borderTop: '1pt solid #e2e8f0',
  },
  footerText: {
    fontSize: 10,
    color: '#94a3b8',
    textAlign: 'center',
  },
  warningBox: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#fee2e2',
    borderRadius: 4,
    border: '1pt solid #ef4444',
  },
  warningText: {
    fontSize: 10,
    color: '#991b1b',
  },
  signatureSection: {
    marginTop: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureBox: {
    width: '45%',
  },
  signatureLine: {
    borderBottom: '1pt solid #94a3b8',
    marginTop: 50,
    marginBottom: 5,
  },
  signatureLabel: {
    fontSize: 10,
    color: '#64748b',
  },
});

interface ClientDebtSlipProps {
  compensation: StaffCompensation & {
    clientSpecificHours?: string;
    clientSpecificAmount?: string;
    clientAllocatedAmount?: string;
    clientOwes?: string;
  };
  clientName: string;
  clientId: string;
  staffName: string;
  clientOwesAmount?: number;
}

export const ClientDebtSlipDocument: React.FC<ClientDebtSlipProps> = ({
  compensation,
  clientName,
  clientId,
  staffName,
  clientOwesAmount,
}) => {
  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: string | number) => {
    return `€${parseFloat(amount.toString()).toFixed(2)}`;
  };

  // Use client-specific hours if available
  const totalHours = parseFloat(compensation.clientSpecificHours || 
    (parseFloat(compensation.regularHours || '0') +
     parseFloat(compensation.overtimeHours || '0') +
     parseFloat(compensation.weekendHours || '0') +
     parseFloat(compensation.holidayHours || '0')).toString());
  
  // Use clientOwesAmount if provided, otherwise use clientOwes from compensation or fall back to clientSpecificAmount
  const amountDue = clientOwesAmount !== undefined ? clientOwesAmount : 
                    parseFloat(compensation.clientOwes || compensation.clientSpecificAmount || compensation.totalCompensation || '0');
  
  // Calculate what's covered by budget
  const budgetCovered = parseFloat(compensation.clientAllocatedAmount || '0');
  const totalServiceAmount = parseFloat(compensation.clientSpecificAmount || compensation.totalCompensation || '0');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>RICHIESTA PAGAMENTO DIRETTO</Text>
          <Text style={styles.subtitle}>Direct Payment Request</Text>
          <Text style={{ fontSize: 10, color: '#94a3b8', marginTop: 5 }}>
            Documento N. {compensation.id.slice(0, 8).toUpperCase()}
          </Text>
          <Text style={{ fontSize: 10, color: '#94a3b8' }}>
            Data Emissione: {formatDate(new Date())}
          </Text>
        </View>

        {/* Client Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DATI CLIENTE / Client Information</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nome / Name:</Text>
            <Text style={styles.value}>{clientName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>ID Cliente / Client ID:</Text>
            <Text style={styles.value}>{clientId}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Tipo Servizio / Service Type:</Text>
            <Text style={styles.value}>Unknown</Text>
          </View>
        </View>

        {/* Staff Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DATI OPERATORE / Staff Information</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Operatore / Staff Member:</Text>
            <Text style={styles.value}>{staffName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Periodo / Period:</Text>
            <Text style={styles.value}>
              {formatDate(compensation.periodStart)} - {formatDate(compensation.periodEnd)}
            </Text>
          </View>
        </View>

        {/* Service Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DETTAGLI SERVIZIO CLIENTE / Client Service Details</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Descrizione / Description</Text>
              <Text style={styles.tableHeaderCell}>Ore / Hours</Text>
              <Text style={styles.tableHeaderCell}>Tariffa / Rate</Text>
              <Text style={styles.tableHeaderCell}>Importo / Amount</Text>
            </View>

            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 2 }]}>Ore Servizio Cliente / Client Service Hours</Text>
              <Text style={styles.tableCell}>{totalHours.toFixed(2)}h</Text>
              <Text style={styles.tableCell}>{totalHours > 0 ? formatCurrency(totalServiceAmount / totalHours) : '-'}</Text>
              <Text style={styles.tableCell}>{formatCurrency(totalServiceAmount)}</Text>
            </View>

            {budgetCovered > 0 && (
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>Coperto da Budget / Covered by Budget</Text>
                <Text style={styles.tableCell}>-</Text>
                <Text style={styles.tableCell}>-</Text>
                <Text style={styles.tableCell}>-{formatCurrency(budgetCovered)}</Text>
              </View>
            )}

            {parseFloat(compensation.totalMileage || '0') > 0 && (
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>Rimborso KM / Mileage</Text>
                <Text style={styles.tableCell}>{compensation.totalMileage} km</Text>
                <Text style={styles.tableCell}>€0.35/km</Text>
                <Text style={styles.tableCell}>{formatCurrency(compensation.mileageReimbursement || 0)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Total Amount */}
        <View style={styles.totalSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Importo Servizio Cliente / Client Service Amount:</Text>
            <Text style={styles.totalValue}>{formatCurrency(totalServiceAmount)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Coperto da Budget / Covered by Budget:</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(budgetCovered)}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>IMPORTO DA PAGARE DIRETTAMENTE / Amount Due Directly:</Text>
            <Text style={[styles.totalValue, { fontSize: 16, color: '#dc2626' }]}>
              {formatCurrency(amountDue)}
            </Text>
          </View>
        </View>

        {/* Warning Box */}
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            IMPORTANTE: Questo importo non è coperto dal budget allocato.
          </Text>
          <Text style={styles.warningText}>
            Il cliente deve pagare €{amountDue.toFixed(2)} direttamente al collaboratore.
          </Text>
          <Text style={[styles.warningText, { marginTop: 5, fontStyle: 'italic' }]}>
            IMPORTANT: This amount is not covered by allocated budget.
          </Text>
          <Text style={[styles.warningText, { fontStyle: 'italic' }]}>
            Client must pay €{amountDue.toFixed(2)} directly to the staff member.
          </Text>
        </View>

        {/* Signature Section */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Firma Cliente / Client Signature</Text>
          </View>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Firma Amministratore / Admin Signature</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Documento generato il {formatDate(new Date())} - Healthcare Service Management Platform
          </Text>
          <Text style={styles.footerText}>
            Questo documento certifica il debito del cliente per servizi resi
          </Text>
        </View>
      </Page>
    </Document>
  );
};

interface ClientDebtSlipButtonProps {
  compensation: StaffCompensation;
  clientName: string;
  clientId: string;
  staffName: string;
  clientOwesAmount?: number;
  className?: string;
  children?: React.ReactNode;
}

export const ClientDebtSlipButton: React.FC<ClientDebtSlipButtonProps> = ({
  compensation,
  clientName,
  clientId,
  staffName,
  clientOwesAmount,
  className,
  children,
}) => {
  const fileName = `Debito_Cliente_${clientName.replace(/\s+/g, '_')}_${compensation.periodStart}_${compensation.periodEnd}.pdf`;

  return (
    <PDFDownloadLink
      document={
        <ClientDebtSlipDocument
          compensation={compensation}
          clientName={clientName}
          clientId={clientId}
          staffName={staffName}
          clientOwesAmount={clientOwesAmount}
        />
      }
      fileName={fileName}
      className={className}
    >
      {({ blob, url, loading, error }) =>
        children ? children : (loading ? 'Generating PDF...' : 'Download Client Debt Slip')
      }
    </PDFDownloadLink>
  );
};