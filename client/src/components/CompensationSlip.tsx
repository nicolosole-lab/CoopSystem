import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { format } from 'date-fns';
import type { StaffCompensation, Staff, Client, StaffRate } from '@shared/schema';
import { useQuery } from '@tanstack/react-query';

interface CompensationSlipProps {
  compensation: StaffCompensation;
  staff: Staff;
  clients: Client[];
}

export default function CompensationSlip({ compensation, staff, clients }: CompensationSlipProps) {
  const slipRef = useRef<HTMLDivElement>(null);
  
  // Fetch staff rates
  const { data: staffRates = [] } = useQuery<StaffRate[]>({
    queryKey: [`/api/staff/${staff.id}/rates`],
    enabled: !!staff.id,
  });
  
  // Get the active rate for the compensation period
  const activeRate = staffRates
    .filter(rate => rate.isActive)
    .sort((a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime())
    .find(rate => new Date(rate.effectiveFrom) <= new Date(compensation.periodEnd));
  
  // Calculate hourly rates based on the active rate
  const regularRate = activeRate ? parseFloat(activeRate.regularRate) : 0;
  const weekendRate = activeRate ? parseFloat(activeRate.weekendRate) : 0;
  const holidayRate = activeRate ? parseFloat(activeRate.holidayRate) : 0;
  const overtimeMultiplier = activeRate ? parseFloat(activeRate.overtimeMultiplier) : 1.5;
  const overtimeRate = regularRate * overtimeMultiplier;

  const generatePDF = async () => {
    if (!slipRef.current) return;

    // Clone the element to manipulate without affecting the original
    const element = slipRef.current;
    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    
    const fileName = `compensation_slip_${staff.firstName}_${staff.lastName}_${format(new Date(compensation.periodEnd), 'MMM_yyyy')}.pdf`;
    pdf.save(fileName);
  };

  // Get unique clients from the compensation time logs (if available)
  const compensationClients: Client[] = [];

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={generatePDF}
        className="gap-2"
      >
        <Download className="h-4 w-4" />
        Download Slip
      </Button>

      {/* Hidden slip content for PDF generation */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <div ref={slipRef} style={{ 
          width: '210mm', 
          padding: '20mm',
          backgroundColor: 'white',
          fontFamily: 'Arial, sans-serif',
          color: '#000',
        }}>
          {/* Header */}
          <div style={{ borderBottom: '2px solid #333', paddingBottom: '10px', marginBottom: '20px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>COMPENSATION SLIP</h1>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
              Generated on {format(new Date(), 'MMMM dd, yyyy')}
            </p>
          </div>

          {/* Company/Organization Info */}
          <div style={{ marginBottom: '30px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>Healthcare Service Organization</h2>
            <p style={{ fontSize: '14px' }}>Cooperative Management System</p>
          </div>

          {/* Employee Information */}
          <div style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px' }}>Employee Information</h3>
            <table style={{ width: '100%', fontSize: '14px' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '5px 0', width: '40%' }}><strong>Name:</strong></td>
                  <td>{staff.firstName} {staff.lastName}</td>
                </tr>
                <tr>
                  <td style={{ padding: '5px 0' }}><strong>Email:</strong></td>
                  <td>{staff.email}</td>
                </tr>
                <tr>
                  <td style={{ padding: '5px 0' }}><strong>Phone:</strong></td>
                  <td>{staff.phone || 'N/A'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '5px 0' }}><strong>Type:</strong></td>
                  <td>{staff.type === 'internal' ? 'Internal Staff' : 'External Contractor'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '5px 0' }}><strong>Specialization:</strong></td>
                  <td>{staff.specializations || 'N/A'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Compensation Period */}
          <div style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px' }}>Compensation Period</h3>
            <table style={{ width: '100%', fontSize: '14px' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '5px 0', width: '40%' }}><strong>Period:</strong></td>
                  <td>
                    {format(new Date(compensation.periodStart), 'MMMM dd, yyyy')} - {format(new Date(compensation.periodEnd), 'MMMM dd, yyyy')}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '5px 0' }}><strong>Status:</strong></td>
                  <td style={{ color: compensation.status === 'paid' ? 'green' : '#ff9800' }}>
                    {compensation.status === 'paid' ? 'PAID' : 'APPROVED'}
                  </td>
                </tr>
                {compensation.paidAt && (
                  <tr>
                    <td style={{ padding: '5px 0' }}><strong>Payment Date:</strong></td>
                    <td>{format(new Date(compensation.paidAt), 'MMMM dd, yyyy')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Hours Breakdown */}
          <div style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px' }}>Hours Breakdown</h3>
            <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #ccc' }}>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Type</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>Hours</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>Rate/Hour</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {parseFloat(compensation.regularHours) > 0 && (
                  <tr>
                    <td style={{ padding: '8px' }}>Regular Hours</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>{parseFloat(compensation.regularHours).toFixed(2)}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>€{regularRate.toFixed(2)}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>€{(parseFloat(compensation.regularHours) * regularRate).toFixed(2)}</td>
                  </tr>
                )}
                {parseFloat(compensation.overtimeHours) > 0 && (
                  <tr>
                    <td style={{ padding: '8px' }}>Overtime Hours</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>{parseFloat(compensation.overtimeHours).toFixed(2)}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>€{overtimeRate.toFixed(2)}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>€{(parseFloat(compensation.overtimeHours) * overtimeRate).toFixed(2)}</td>
                  </tr>
                )}
                {parseFloat(compensation.weekendHours) > 0 && (
                  <tr>
                    <td style={{ padding: '8px' }}>Weekend Hours</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>{parseFloat(compensation.weekendHours).toFixed(2)}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>€{weekendRate.toFixed(2)}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>€{(parseFloat(compensation.weekendHours) * weekendRate).toFixed(2)}</td>
                  </tr>
                )}
                {parseFloat(compensation.holidayHours) > 0 && (
                  <tr>
                    <td style={{ padding: '8px' }}>Holiday Hours</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>{parseFloat(compensation.holidayHours).toFixed(2)}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>€{holidayRate.toFixed(2)}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>€{(parseFloat(compensation.holidayHours) * holidayRate).toFixed(2)}</td>
                  </tr>
                )}
                <tr style={{ borderTop: '2px solid #333', fontWeight: 'bold' }}>
                  <td style={{ padding: '8px' }}>TOTALS</td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    {(parseFloat(compensation.regularHours) + parseFloat(compensation.overtimeHours) + 
                     parseFloat(compensation.weekendHours) + parseFloat(compensation.holidayHours)).toFixed(2)}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>-</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>€{parseFloat(compensation.totalCompensation).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Clients Served (if available) */}
          {compensationClients.length > 0 && (
            <div style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px' }}>Clients Served</h3>
              <ul style={{ fontSize: '14px', paddingLeft: '20px' }}>
                {compensationClients.map((client: any) => (
                  <li key={client.id} style={{ padding: '3px 0' }}>
                    {client.firstName} {client.lastName}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Footer */}
          <div style={{ marginTop: '50px', paddingTop: '20px', borderTop: '1px solid #ccc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
              <div style={{ width: '45%' }}>
                <p style={{ fontSize: '12px', marginBottom: '40px' }}>Employee Signature:</p>
                <div style={{ borderTop: '1px solid #333', paddingTop: '5px' }}>
                  <p style={{ fontSize: '12px' }}>{staff.firstName} {staff.lastName}</p>
                </div>
              </div>
              <div style={{ width: '45%' }}>
                <p style={{ fontSize: '12px', marginBottom: '40px' }}>Authorized Signature:</p>
                <div style={{ borderTop: '1px solid #333', paddingTop: '5px' }}>
                  <p style={{ fontSize: '12px' }}>HR Department</p>
                </div>
              </div>
            </div>
            <p style={{ fontSize: '10px', textAlign: 'center', color: '#666' }}>
              This is a computer-generated document. No signature is required.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}