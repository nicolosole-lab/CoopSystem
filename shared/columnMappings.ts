// Column mappings for different languages
export const columnMappings = {
  en: {
    rowNumber: 'Row',
    department: 'Department',
    clientName: 'Client Name',
    taxCode: 'Tax Code',
    serviceType: 'Service Type',
    serviceCategory: 'Service Category',
    recordedStart: 'Recorded Start',
    recordedEnd: 'Recorded End',
    duration: 'Duration',
    kilometers: 'Kilometers',
    value: 'Value',
    operator: 'Operator',
    cityOfResidence: 'City',
    regionOfResidence: 'Region',
    agreement: 'Agreement',
    notes: 'Notes',
    validTag: 'Status',
    appointmentType: 'Appointment Type',
    cost1: 'Cost 1',
    cost2: 'Cost 2',
    cost3: 'Cost 3',
    // Excel import headers
    importDate: 'Import Date',
    importTime: 'Import Time',
    filename: 'Filename',
    rows: 'Rows',
    actions: 'Actions',
    uploaded: 'Uploaded'
  },
  it: {
    rowNumber: 'Riga',
    department: 'Dipartimento',
    clientName: 'Nome Cliente',
    taxCode: 'Codice Fiscale',
    serviceType: 'Tipo Servizio',
    serviceCategory: 'Categoria Servizio',
    recordedStart: 'Inizio Registrato',
    recordedEnd: 'Fine Registrato',
    duration: 'Durata',
    kilometers: 'Chilometri',
    value: 'Valore',
    operator: 'Operatore',
    cityOfResidence: 'Città',
    regionOfResidence: 'Regione',
    agreement: 'Accordo',
    notes: 'Note',
    validTag: 'Stato',
    appointmentType: 'Tipo Appuntamento',
    cost1: 'Costo 1',
    cost2: 'Costo 2',
    cost3: 'Costo 3',
    // Excel import headers
    importDate: 'Data Importazione',
    importTime: 'Ora Importazione',
    filename: 'Nome File',
    rows: 'Righe',
    actions: 'Azioni',
    uploaded: 'Caricato'
  }
};

export type Language = keyof typeof columnMappings;
export type ColumnKey = keyof typeof columnMappings.en;

export function getColumnLabel(key: ColumnKey, language: Language = 'en'): string {
  return columnMappings[language][key] || columnMappings.en[key] || key;
}