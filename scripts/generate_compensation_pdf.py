#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script per generare PDF con tabella compensi collaboratori
"""

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from datetime import datetime

def create_compensation_pdf():
    # Dati della tabella
    data = [
        ['ID Collab', 'Cognome', 'Nome', 'Tariffa\nFeriale\n€/h', 'Ore\nFeriali', 
         'Prodotto\nFeriale €', 'Tariffa\nFestiva\n€/h', 'Ore\nFestive', 
         'Prodotto\nFestivo €', 'N. Km', 'Tariffa\nKm €/km', 'Prodotto\nKm €', 'TOTALE €'],
        ['67e95de2', 'CATALINOIU', 'DOINA', '20,00', '55,00', '1.100,00', 
         '20,00', '32,00', '640,00', '0,00', '0,50', '0,00', '1.740,00'],
        ['0b772c21', 'SARR', 'MAME FANY', '20,00', '51,50', '1.030,00', 
         '20,00', '16,00', '320,00', '0,00', '0,50', '0,00', '1.350,00'],
        ['222eecb8', 'GHEORGHIU', 'GEORGIANA', '20,00', '56,00', '1.120,00', 
         '20,00', '0,00', '0,00', '0,00', '0,50', '0,00', '1.120,00'],
        ['7e33f95c', 'MELE', 'ELEONORA', '20,00', '36,00', '720,00', 
         '20,00', '8,00', '160,00', '0,00', '0,50', '0,00', '880,00'],
        ['689dcb8a', 'VIRDIS', 'ROBERTA', '20,00', '42,00', '840,00', 
         '20,00', '0,00', '0,00', '0,00', '0,50', '0,00', '840,00'],
        ['08016aa2', 'SINI', 'MARIA RITA', '20,00', '37,00', '740,00', 
         '20,00', '4,00', '80,00', '0,00', '0,50', '0,00', '820,00'],
        ['d9aa73b4', 'GAVRIL', 'LILIANA', '20,00', '40,00', '800,00', 
         '20,00', '0,00', '0,00', '0,00', '0,50', '0,00', '800,00'],
        ['231ea82f', 'NDIAYE', 'KHADY', '20,00', '38,00', '760,00', 
         '20,00', '0,00', '0,00', '0,00', '0,50', '0,00', '760,00'],
    ]
    
    # Crea il documento PDF
    filename = "compensi_collaboratori_agosto_2025.pdf"
    doc = SimpleDocTemplate(
        filename,
        pagesize=landscape(A4),
        rightMargin=1*cm,
        leftMargin=1*cm,
        topMargin=2*cm,
        bottomMargin=1*cm
    )
    
    # Contenitore per gli elementi del PDF
    elements = []
    
    # Stili
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=16,
        textColor=colors.HexColor('#1e40af'),
        spaceAfter=30,
        alignment=TA_CENTER
    )
    
    # Titolo
    title = Paragraph("Tabella Compensi Collaboratori - Agosto 2025", title_style)
    elements.append(title)
    elements.append(Spacer(1, 12))
    
    # Crea la tabella
    table = Table(data, repeatRows=1)
    
    # Stile della tabella
    table.setStyle(TableStyle([
        # Header
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3b82f6')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        
        # Body
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('ALIGN', (0, 1), (2, -1), 'LEFT'),  # ID, Cognome, Nome
        ('ALIGN', (3, 1), (-1, -1), 'RIGHT'),  # Numeri
        
        # Griglia
        ('GRID', (0, 0), (-1, -1), 1, colors.grey),
        
        # Colonna TOTALE in grassetto
        ('FONTNAME', (-1, 1), (-1, -1), 'Helvetica-Bold'),
        ('BACKGROUND', (-1, 1), (-1, -1), colors.HexColor('#fef3c7')),
        
        # Righe alternate
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f3f4f6')]),
    ]))
    
    elements.append(table)
    elements.append(Spacer(1, 20))
    
    # Riepilogo
    summary_style = ParagraphStyle(
        'Summary',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#374151')
    )
    
    summary_text = """
    <b>Riepilogo Totali:</b><br/>
    • Totale ore feriali: 355,00 ore<br/>
    • Totale ore festive: 60,00 ore<br/>
    • Totale chilometri: 0,00 km<br/>
    • <b>Totale compensi: €8.310,00</b><br/>
    <br/>
    <i>Note: Dati estratti per il periodo Agosto 2025. 
    Ore feriali: lunedì-sabato. Ore festive: domeniche.
    Fonte: Database cooperativa sanitaria.</i>
    """
    
    summary = Paragraph(summary_text, summary_style)
    elements.append(summary)
    
    # Footer con data generazione
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.grey,
        alignment=TA_CENTER
    )
    
    elements.append(Spacer(1, 30))
    footer_text = f"Documento generato il {datetime.now().strftime('%d/%m/%Y alle %H:%M')}"
    footer = Paragraph(footer_text, footer_style)
    elements.append(footer)
    
    # Genera il PDF
    doc.build(elements)
    print(f"✅ PDF generato con successo: {filename}")
    return filename

if __name__ == "__main__":
    create_compensation_pdf()