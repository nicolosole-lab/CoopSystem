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
    # Dati della tabella (senza colonna ID) - Aggiornati con le nuove tariffe
    data = [
        ['Cognome\nSurname', 'Nome\nName', 'Tariffa Feriale\nWeekday Rate\n€/h', 'Ore Feriali\nWeekday Hours', 
         'Prodotto Feriale\nWeekday Total\n€', 'Tariffa Festiva\nHoliday Rate\n€/h', 'Ore Festive\nHoliday Hours', 
         'Prodotto Festivo\nHoliday Total\n€', 'N. Km\nKilometers', 'Tariffa Km\nKm Rate\n€/km', 
         'Prodotto Km\nKm Total\n€', 'TOTALE\nTOTAL\n€'],
        ['BAICU', 'PETRICA', '8,00', '8,00', '64,00', 
         '9,00', '0,00', '0,00', '0,00', '0,50', '0,00', '64,00'],
        ['BROSTIC', 'LILIANA', '8,00', '58,00', '464,00', 
         '9,00', '8,00', '72,00', '0,00', '0,50', '0,00', '536,00'],
        ['CATALINOIU', 'DOINA', '8,00', '55,00', '440,00', 
         '9,00', '32,00', '288,00', '0,00', '0,50', '0,00', '728,00'],
        ['DALU', 'CARMEN', '8,00', '11,00', '88,00', 
         '9,00', '0,00', '0,00', '0,00', '0,50', '0,00', '88,00'],
        ['DUMBRAVA', 'SIMONA', '8,00', '21,00', '168,00', 
         '9,00', '0,00', '0,00', '0,00', '0,50', '0,00', '168,00'],
        ['FADDA', 'DANIELA', '8,00', '36,00', '288,00', 
         '9,00', '0,00', '0,00', '0,00', '0,50', '0,00', '288,00'],
        ['FOIS', 'GIAN PIERA', '8,00', '13,71', '109,68', 
         '9,00', '0,00', '0,00', '0,00', '0,50', '0,00', '109,68'],
        ['GAVRIL', 'LILIANA', '8,00', '40,00', '320,00', 
         '9,00', '0,00', '0,00', '0,00', '0,50', '0,00', '320,00'],
        ['GHEORGHIU', 'GEORGIANA', '8,00', '56,00', '448,00', 
         '9,00', '0,00', '0,00', '0,00', '0,50', '0,00', '448,00'],
        ['MANCHIA', 'MARIELLA', '8,00', '25,00', '200,00', 
         '9,00', '0,00', '0,00', '0,00', '0,50', '0,00', '200,00'],
        ['MARCIAS', 'ELOISA', '8,00', '22,00', '176,00', 
         '9,00', '0,00', '0,00', '0,00', '0,50', '0,00', '176,00'],
        ['MARONGIU', 'FABIO', '8,00', '21,50', '172,00', 
         '9,00', '0,00', '0,00', '0,00', '0,50', '0,00', '172,00'],
        ['MELE', 'ELEONORA', '8,00', '36,00', '288,00', 
         '9,00', '8,00', '72,00', '0,00', '0,50', '0,00', '360,00'],
        ['NDIAYE', 'KHADY', '8,00', '38,00', '304,00', 
         '9,00', '0,00', '0,00', '0,00', '0,50', '0,00', '304,00'],
        ['PILERI', 'ANNA', '8,00', '34,00', '272,00', 
         '9,00', '0,00', '0,00', '0,00', '0,50', '0,00', '272,00'],
        ['PIPPIA', 'MARIA CATERINA', '8,00', '9,00', '72,00', 
         '9,00', '0,00', '0,00', '0,00', '0,50', '0,00', '72,00'],
        ['PIRAS', 'LETIZIA', '8,00', '24,00', '192,00', 
         '9,00', '0,00', '0,00', '0,00', '0,50', '0,00', '192,00'],
        ['SABA', 'SABRINA', '8,00', '15,00', '120,00', 
         '9,00', '0,00', '0,00', '0,00', '0,50', '0,00', '120,00'],
        ['SARR', 'MAME FANY', '8,00', '51,50', '412,00', 
         '9,00', '16,00', '144,00', '0,00', '0,50', '0,00', '556,00'],
        ['SILVESTRINI', 'NOEMI', '8,00', '22,50', '180,00', 
         '9,00', '0,00', '0,00', '0,00', '0,50', '0,00', '180,00'],
        ['SINI', 'MARIA RITA', '8,00', '37,00', '296,00', 
         '9,00', '4,00', '36,00', '0,00', '0,50', '0,00', '332,00'],
        ['SOLE', "NICOLO'", '8,00', '5,00', '40,00', 
         '9,00', '0,00', '0,00', '0,00', '0,50', '0,00', '40,00'],
        ['THIAM', 'CHEIKH ABSA', '8,00', '16,50', '132,00', 
         '9,00', '0,00', '0,00', '0,00', '0,50', '0,00', '132,00'],
        ['VIRDIS', 'ROBERTA', '8,00', '42,00', '336,00', 
         '9,00', '0,00', '0,00', '0,00', '0,50', '0,00', '336,00'],
        ['VULPE', 'VIORICA', '8,00', '10,00', '80,00', 
         '9,00', '0,00', '0,00', '0,00', '0,50', '0,00', '80,00'],
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
    
    # Titolo bilingue
    title = Paragraph("Tabella Compensi Collaboratori - Staff Compensation Table<br/>Agosto 2025 - August 2025", title_style)
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
        ('ALIGN', (0, 1), (1, -1), 'LEFT'),  # Cognome, Nome
        ('ALIGN', (2, 1), (-1, -1), 'RIGHT'),  # Numeri
        
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
    <b>Riepilogo Totali / Summary Totals:</b><br/>
    • Totale ore feriali / Total weekday hours: 707,71 ore / hours<br/>
    • Totale ore festive / Total holiday hours: 68,00 ore / hours<br/>
    • Totale chilometri / Total kilometers: 0,00 km<br/>
    • <b>Totale compensi / Total compensation: €6.273,68</b><br/>
    <br/>
    <i>Note / Notes: Dati estratti per il periodo Agosto 2025 / Data extracted for August 2025. 
    Ore feriali: lunedì-sabato / Weekday hours: Monday-Saturday. 
    Ore festive: domeniche / Holiday hours: Sundays.
    Fonte: Database cooperativa sanitaria / Source: Healthcare cooperative database.</i>
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
    footer_text = f"Documento generato il / Document generated on: {datetime.now().strftime('%d/%m/%Y - %H:%M')}"
    footer = Paragraph(footer_text, footer_style)
    elements.append(footer)
    
    # Genera il PDF
    doc.build(elements)
    print(f"✅ PDF generato con successo: {filename}")
    return filename

if __name__ == "__main__":
    create_compensation_pdf()