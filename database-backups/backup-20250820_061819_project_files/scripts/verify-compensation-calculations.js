#!/usr/bin/env node

/**
 * Procedura di Verifica Sistema Compensi
 * Verifica automatica inserimento tariffe e aggiornamento calcoli database
 */

import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

class CompensationVerifier {
  constructor() {
    this.results = [];
    this.errors = [];
  }

  log(message, type = 'INFO') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${type}: ${message}`;
    console.log(logEntry);
    this.results.push(logEntry);
  }

  error(message) {
    this.log(message, 'ERROR');
    this.errors.push(message);
  }

  success(message) {
    this.log(message, 'SUCCESS');
  }

  async executeQuery(query, params = []) {
    try {
      const result = await pool.query(query, params);
      return result;
    } catch (error) {
      this.error(`Query failed: ${error.message}`);
      throw error;
    }
  }

  async testDatabaseTrigger() {
    this.log('=== TEST 1: Verifica Trigger PostgreSQL ===');
    
    try {
      // Crea un record di test
      const testStaff = await this.executeQuery(`
        INSERT INTO staff (
          id, first_name, last_name, email, 
          weekday_rate, holiday_rate, mileage_rate,
          created_at, updated_at
        ) VALUES (
          'test-staff-' || extract(epoch from now()), 
          'Test', 'Verifica', 'test@example.com',
          15.50, 25.75, 0.60,
          NOW(), NOW()
        ) RETURNING id, weekday_rate, holiday_rate, mileage_rate
      `);
      
      const staffId = testStaff.rows[0].id;
      this.success(`Creato staff test: ${staffId}`);

      // Crea compenso di test
      const testCompensation = await this.executeQuery(`
        INSERT INTO compensations (
          id, staff_id, period_start, period_end,
          regular_hours, holiday_hours, total_mileage,
          created_at, updated_at
        ) VALUES (
          'test-comp-' || extract(epoch from now()),
          $1, '2025-08-01', '2025-08-31',
          10.0, 5.0, 20.0,
          NOW(), NOW()
        ) RETURNING id, regular_hours, holiday_hours, total_mileage
      `, [staffId]);

      const compId = testCompensation.rows[0].id;
      this.success(`Creato compenso test: ${compId}`);

      // Verifica calcoli automatici
      const calculated = await this.executeQuery(`
        SELECT 
          c.regular_hours, c.holiday_hours, c.total_mileage,
          c.weekday_total, c.holiday_total, c.mileage_total, c.total_amount,
          s.weekday_rate, s.holiday_rate, s.mileage_rate,
          (c.regular_hours * s.weekday_rate) as expected_weekday,
          (c.holiday_hours * s.holiday_rate) as expected_holiday,
          (c.total_mileage * s.mileage_rate) as expected_mileage
        FROM compensations c
        JOIN staff s ON c.staff_id = s.id
        WHERE c.id = $1
      `, [compId]);

      const calc = calculated.rows[0];
      const expectedTotal = parseFloat(calc.expected_weekday) + parseFloat(calc.expected_holiday) + parseFloat(calc.expected_mileage);

      // Verifica calcoli
      if (parseFloat(calc.weekday_total) === parseFloat(calc.expected_weekday)) {
        this.success(`✓ Calcolo feriale corretto: ${calc.regular_hours}h × €${calc.weekday_rate} = €${calc.weekday_total}`);
      } else {
        this.error(`✗ Calcolo feriale errato: atteso €${calc.expected_weekday}, ottenuto €${calc.weekday_total}`);
      }

      if (parseFloat(calc.holiday_total) === parseFloat(calc.expected_holiday)) {
        this.success(`✓ Calcolo festivo corretto: ${calc.holiday_hours}h × €${calc.holiday_rate} = €${calc.holiday_total}`);
      } else {
        this.error(`✗ Calcolo festivo errato: atteso €${calc.expected_holiday}, ottenuto €${calc.holiday_total}`);
      }

      if (parseFloat(calc.mileage_total) === parseFloat(calc.expected_mileage)) {
        this.success(`✓ Calcolo chilometri corretto: ${calc.total_mileage}km × €${calc.mileage_rate} = €${calc.mileage_total}`);
      } else {
        this.error(`✗ Calcolo chilometri errato: atteso €${calc.expected_mileage}, ottenuto €${calc.mileage_total}`);
      }

      if (Math.abs(parseFloat(calc.total_amount) - expectedTotal) < 0.01) {
        this.success(`✓ Totale generale corretto: €${calc.total_amount}`);
      } else {
        this.error(`✗ Totale generale errato: atteso €${expectedTotal}, ottenuto €${calc.total_amount}`);
      }

      // Cleanup
      await this.executeQuery('DELETE FROM compensations WHERE id = $1', [compId]);
      await this.executeQuery('DELETE FROM staff WHERE id = $1', [staffId]);
      this.success('Cleanup test completato');

    } catch (error) {
      this.error(`Test trigger fallito: ${error.message}`);
    }
  }

  async testRateUpdates() {
    this.log('=== TEST 2: Verifica Aggiornamento Tariffe ===');
    
    try {
      // Usa staff esistente
      const existingStaff = await this.executeQuery(`
        SELECT id, first_name, last_name, weekday_rate, holiday_rate, mileage_rate
        FROM staff 
        WHERE weekday_rate > 0 
        LIMIT 1
      `);

      if (existingStaff.rows.length === 0) {
        this.error('Nessuno staff con tariffe trovato');
        return;
      }

      const staff = existingStaff.rows[0];
      const originalRates = {
        weekday: parseFloat(staff.weekday_rate),
        holiday: parseFloat(staff.holiday_rate),
        mileage: parseFloat(staff.mileage_rate)
      };

      this.log(`Testando aggiornamento tariffe per: ${staff.first_name} ${staff.last_name}`);

      // Test aggiornamento tariffa feriale
      const newWeekdayRate = 18.50;
      await this.executeQuery(`
        UPDATE staff SET weekday_rate = $1, updated_at = NOW() WHERE id = $2
      `, [newWeekdayRate, staff.id]);

      // Forza ricalcolo compensi esistenti
      await this.executeQuery(`
        UPDATE compensations SET updated_at = NOW() WHERE staff_id = $1
      `, [staff.id]);

      // Verifica aggiornamento
      const updatedCompensations = await this.executeQuery(`
        SELECT 
          c.regular_hours, c.weekday_total,
          s.weekday_rate,
          (c.regular_hours * s.weekday_rate) as expected_total
        FROM compensations c
        JOIN staff s ON c.staff_id = s.id
        WHERE s.id = $1 AND c.regular_hours > 0
        LIMIT 1
      `, [staff.id]);

      if (updatedCompensations.rows.length > 0) {
        const comp = updatedCompensations.rows[0];
        if (Math.abs(parseFloat(comp.weekday_total) - parseFloat(comp.expected_total)) < 0.01) {
          this.success(`✓ Aggiornamento tariffa feriale: ${comp.regular_hours}h × €${comp.weekday_rate} = €${comp.weekday_total}`);
        } else {
          this.error(`✗ Aggiornamento tariffa feriale fallito: atteso €${comp.expected_total}, ottenuto €${comp.weekday_total}`);
        }
      }

      // Ripristina tariffe originali
      await this.executeQuery(`
        UPDATE staff SET 
          weekday_rate = $1, 
          holiday_rate = $2, 
          mileage_rate = $3,
          updated_at = NOW() 
        WHERE id = $4
      `, [originalRates.weekday, originalRates.holiday, originalRates.mileage, staff.id]);

      // Ricalcola compensi
      await this.executeQuery(`
        UPDATE compensations SET updated_at = NOW() WHERE staff_id = $1
      `, [staff.id]);

      this.success('Tariffe ripristinate alle condizioni originali');

    } catch (error) {
      this.error(`Test aggiornamento tariffe fallito: ${error.message}`);
    }
  }

  async testDataConsistency() {
    this.log('=== TEST 3: Verifica Consistenza Dati ===');
    
    try {
      // Verifica compensi con calcoli errati
      const inconsistentData = await this.executeQuery(`
        SELECT 
          s.first_name || ' ' || s.last_name as staff_name,
          c.regular_hours, c.holiday_hours, c.total_mileage,
          c.weekday_total, c.holiday_total, c.mileage_total, c.total_amount,
          s.weekday_rate, s.holiday_rate, s.mileage_rate,
          (c.regular_hours * s.weekday_rate) as expected_weekday,
          (c.holiday_hours * s.holiday_rate) as expected_holiday,
          (c.total_mileage * s.mileage_rate) as expected_mileage,
          (c.regular_hours * s.weekday_rate + c.holiday_hours * s.holiday_rate + c.total_mileage * s.mileage_rate) as expected_total
        FROM compensations c
        JOIN staff s ON c.staff_id = s.id
        WHERE 
          ABS(c.weekday_total - (c.regular_hours * s.weekday_rate)) > 0.01 OR
          ABS(c.holiday_total - (c.holiday_hours * s.holiday_rate)) > 0.01 OR
          ABS(c.mileage_total - (c.total_mileage * s.mileage_rate)) > 0.01 OR
          ABS(c.total_amount - (c.regular_hours * s.weekday_rate + c.holiday_hours * s.holiday_rate + c.total_mileage * s.mileage_rate)) > 0.01
      `);

      if (inconsistentData.rows.length === 0) {
        this.success('✓ Tutti i calcoli sono consistenti nel database');
      } else {
        this.error(`✗ Trovati ${inconsistentData.rows.length} record con calcoli inconsistenti:`);
        inconsistentData.rows.forEach(row => {
          this.error(`  - ${row.staff_name}: Totale atteso €${row.expected_total}, ottenuto €${row.total_amount}`);
        });
      }

      // Statistiche generali
      const stats = await this.executeQuery(`
        SELECT 
          COUNT(*) as total_compensations,
          COUNT(DISTINCT staff_id) as unique_staff,
          SUM(total_amount) as total_compensations_value,
          AVG(total_amount) as avg_compensation
        FROM compensations
        WHERE total_amount > 0
      `);

      const stat = stats.rows[0];
      this.log(`Statistiche database: ${stat.total_compensations} compensi, ${stat.unique_staff} staff, valore totale €${parseFloat(stat.total_compensations_value).toFixed(2)}`);

    } catch (error) {
      this.error(`Test consistenza dati fallito: ${error.message}`);
    }
  }

  async generateReport() {
    this.log('=== REPORT FINALE ===');
    
    const totalTests = this.results.filter(r => r.includes('TEST')).length;
    const successCount = this.results.filter(r => r.includes('SUCCESS')).length;
    const errorCount = this.errors.length;

    this.log(`Test eseguiti: ${totalTests}`);
    this.log(`Operazioni riuscite: ${successCount}`);
    this.log(`Errori rilevati: ${errorCount}`);

    if (errorCount === 0) {
      this.success('🎉 TUTTI I TEST SUPERATI - Sistema compensi funziona correttamente!');
    } else {
      this.error('⚠️  ALCUNI TEST FALLITI - Verificare problemi rilevati');
    }

    // Salva report
    const reportContent = this.results.join('\n');
    const reportPath = `compensation-verification-${new Date().toISOString().slice(0,10)}.log`;
    fs.writeFileSync(reportPath, reportContent);
    this.log(`Report salvato in: ${reportPath}`);

    return errorCount === 0;
  }

  async run() {
    this.log('Avvio procedura verifica sistema compensi...');
    
    try {
      await this.testDatabaseTrigger();
      await this.testRateUpdates();
      await this.testDataConsistency();
      
      const success = await this.generateReport();
      process.exit(success ? 0 : 1);
      
    } catch (error) {
      this.error(`Errore critico: ${error.message}`);
      process.exit(1);
    } finally {
      await pool.end();
    }
  }
}

// Esegui verifica se chiamato direttamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const verifier = new CompensationVerifier();
  verifier.run();
}

export default CompensationVerifier;