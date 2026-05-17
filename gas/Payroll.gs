// ============================================================
// Payroll.gs — Payroll Periods, Calculation, Confirm
// ============================================================

function getPeriods() {
  return sheetToObjects(getSheet('PayrollPeriods')).map(function(r) {
    return {
      periodID: r['PeriodID'], name: r['ชื่องวด'],
      dateFrom: r['วันเริ่ม'], dateTo: r['วันสิ้นสุด'],
      status: r['สถานะ'], created: r['สร้างเมื่อ']
    };
  }).reverse();
}

function createPeriod(d) {
  var sh = getSheet('PayrollPeriods');
  var rows = sheetToObjects(sh);
  var periodID = 'P' + Date.now();
  sh.appendRow([periodID, d.name, d.dateFrom, d.dateTo, 'Draft', thaiDate()]);
  // Auto-calculate draft payroll
  _draftPayroll(periodID, d.dateFrom, d.dateTo);
  return { success: true, periodID: periodID };
}

function _parseDateThai(str) {
  // dd/MM/BBBB -> Date (CE)
  var p = str.split('/');
  return new Date(parseInt(p[2]) - 543, parseInt(p[1]) - 1, parseInt(p[0]));
}

function _draftPayroll(periodID, dateFromStr, dateToStr) {
  var cfg = getConfig();
  var sh = getSheet('PayrollDetail');
  var emps = getEmployees().filter(function(e) { return e.status === 'Active'; });
  var dateFrom = _parseDateThai(dateFromStr);
  var dateTo = _parseDateThai(dateToStr);

  // ดึง manual deductions ของงวดนี้
  var deductions = sheetToObjects(getSheet('ManualDeductions'))
    .filter(function(r) { return r['PeriodID'] === periodID; });

  emps.forEach(function(emp) {
    // ตรวจสอบมีแถวนี้แล้วหรือยัง
    var existing = sheetToObjects(sh).find(function(r) {
      return r['PeriodID'] === periodID && r['EmpID'] === emp.empID;
    });
    if (existing && existing['สถานะ'] === 'Confirmed') return; // ข้าม

    var work = getWorkdaysInPeriod(emp.empID, dateFrom, dateTo);
    var dailyRate = parseFloat(emp.dailyRate) || 0;
    var otRate = parseFloat(emp.otRate) || dailyRate / 8 * 1.5;
    var foodPerDay = parseFloat(cfg.FOOD_PER_DAY) || 50;

    var basePay = work.days * dailyRate;
    // OT ชั่วโมงเกิน 8 ชม./วัน (estimate: total hours - 8*days)
    var regularHours = work.days * 8;
    var otHours = Math.max(0, parseFloat(work.hours) - regularHours);
    var otPay = otHours * otRate;
    var foodPay = work.days * foodPerDay;

    // Deductions สำหรับพนักงานคนนี้
    var lateDed = deductions
      .filter(function(r) { return r['EmpID'] === emp.empID && r['ประเภท'] === 'มาสาย'; })
      .reduce(function(s, r) { return s + (parseFloat(r['ยอดหัก']) || 0); }, 0);
    var absentDed = deductions
      .filter(function(r) { return r['EmpID'] === emp.empID && r['ประเภท'] === 'ขาดงาน'; })
      .reduce(function(s, r) { return s + (parseFloat(r['ยอดหัก']) || 0); }, 0);

    // คำนวณ Loan deduction
    var loans = sheetToObjects(getSheet('Loans'))
      .filter(function(r) { return r['EmpID'] === emp.empID && r['สถานะ'] === 'Active' && parseFloat(r['คงเหลือ']) > 0; });
    var loanDed = loans.reduce(function(s, r) {
      return s + Math.min(parseFloat(r['หักต่องวด']) || 0, parseFloat(r['คงเหลือ']) || 0);
    }, 0);

    var netPay = basePay + otPay + foodPay - lateDed - absentDed - loanDed;

    var row = [periodID, emp.empID, emp.name, work.days,
               basePay.toFixed(2), otPay.toFixed(2), foodPay.toFixed(2),
               cfg.DILIGENCE_BONUS || 0, 0,   // เบี้ยขยัน/เบิก — admin set ทีหลัง
               lateDed.toFixed(2), absentDed.toFixed(2), loanDed.toFixed(2), 0,
               netPay.toFixed(2), 'Draft'];

    if (existing) {
      var rowIdx = existing._row;
      sh.getRange(rowIdx, 1, 1, row.length).setValues([row]);
    } else {
      sh.appendRow(row);
    }
  });
}

function getPayroll(p) {
  var rows = sheetToObjects(getSheet('PayrollDetail'));
  if (p.periodID) rows = rows.filter(function(r) { return r['PeriodID'] === p.periodID; });
  if (p.empID) rows = rows.filter(function(r) { return r['EmpID'] === p.empID; });

  // ดึง manual deductions มาแนบด้วย
  var allDeductions = sheetToObjects(getSheet('ManualDeductions'));

  return rows
    .sort(function(a, b) {
      var at = a['EmpID'].charAt(0), bt = b['EmpID'].charAt(0);
      if (at !== bt) return at === 'M' ? -1 : 1;
      return a['EmpID'].localeCompare(b['EmpID']);
    })
    .map(function(r) {
      var deds = allDeductions.filter(function(d) {
        return d['PeriodID'] === r['PeriodID'] && d['EmpID'] === r['EmpID'];
      });
      return {
        periodID: r['PeriodID'], empID: r['EmpID'], name: r['ชื่อ'],
        workDays: r['วันทำงาน'], basePay: r['ยอดฐาน'], otPay: r['OT'],
        foodPay: r['ค่าอาหาร'], diligence: r['เบี้ยขยัน'], advance: r['เบิกล่วงหน้า'],
        lateDeduct: r['หักมาสาย'], absentDeduct: r['หักขาดงาน'],
        loanDeduct: r['หักเงินกู้'], accumDeduct: r['หักสะสม'],
        netPay: r['เงินสุทธิ'], status: r['สถานะ'],
        manualDeductions: deds.map(function(d) {
          return { type: d['ประเภท'], date: d['วันที่'], detail: d['รายละเอียด'], amount: d['ยอดหัก'], note: d['หมายเหตุ'] };
        })
      };
    });
}

function savePayrollRow(d) {
  var sh = getSheet('PayrollDetail');
  var rows = sheetToObjects(sh);
  var rec = rows.find(function(r) { return r['PeriodID'] === d.periodID && r['EmpID'] === d.empID; });
  if (!rec) return { error: 'ไม่พบรายการ' };
  if (rec['สถานะ'] === 'Confirmed') return { error: 'งวดนี้ยืนยันแล้ว' };

  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var fields = {
    'เบี้ยขยัน': d.diligence, 'เบิกล่วงหน้า': d.advance,
    'หักมาสาย': d.lateDeduct, 'หักขาดงาน': d.absentDeduct, 'หักสะสม': d.accumDeduct
  };
  Object.entries(fields).forEach(function(kv) {
    var col = headers.indexOf(kv[0]) + 1;
    if (col > 0 && kv[1] !== undefined) sh.getRange(rec._row, col).setValue(kv[1]);
  });

  // Recalculate net
  var r = sheetToObjects(sh).find(function(r2) { return r2['PeriodID'] === d.periodID && r2['EmpID'] === d.empID; });
  var net = (parseFloat(r['ยอดฐาน'])||0) + (parseFloat(r['OT'])||0) + (parseFloat(r['ค่าอาหาร'])||0)
    + (parseFloat(r['เบี้ยขยัน'])||0) - (parseFloat(r['เบิกล่วงหน้า'])||0)
    - (parseFloat(r['หักมาสาย'])||0) - (parseFloat(r['หักขาดงาน'])||0)
    - (parseFloat(r['หักเงินกู้'])||0) - (parseFloat(r['หักสะสม'])||0);
  var netCol = headers.indexOf('เงินสุทธิ') + 1;
  sh.getRange(rec._row, netCol).setValue(net.toFixed(2));

  return { success: true, netPay: net.toFixed(2) };
}

function confirmPayroll(d) {
  var sh = getSheet('PayrollDetail');
  var periodSh = getSheet('PayrollPeriods');
  var rows = sheetToObjects(sh);
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var stCol = headers.indexOf('สถานะ') + 1;

  rows.filter(function(r) { return r['PeriodID'] === d.periodID; })
    .forEach(function(r) {
      sh.getRange(r._row, stCol).setValue('Confirmed');
      // ตัด loan
      _applyLoanDeductions(r['EmpID'], parseFloat(r['หักเงินกู้']) || 0);
    });

  // Update period status
  var pRows = sheetToObjects(periodSh);
  var period = pRows.find(function(r) { return r['PeriodID'] === d.periodID; });
  if (period) {
    var ph = periodSh.getRange(1, 1, 1, periodSh.getLastColumn()).getValues()[0];
    periodSh.getRange(period._row, ph.indexOf('สถานะ') + 1).setValue('Confirmed');
  }
  return { success: true };
}

function addManualDeduction(d) {
  var sh = getSheet('ManualDeductions');
  var deductID = 'DED' + Date.now();
  sh.appendRow([deductID, d.periodID, d.empID, d.type, d.date, d.detail, d.amount, d.note || '']);
  // Refresh draft
  var periods = sheetToObjects(getSheet('PayrollPeriods'));
  var period = periods.find(function(r) { return r['PeriodID'] === d.periodID; });
  if (period) _draftPayroll(d.periodID, period['วันเริ่ม'], period['วันสิ้นสุด']);
  return { success: true };
}

function _applyLoanDeductions(empID, amount) {
  if (!amount || amount <= 0) return;
  var sh = getSheet('Loans');
  var rows = sheetToObjects(sh);
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var remaining = amount;

  rows.filter(function(r) { return r['EmpID'] === empID && r['สถานะ'] === 'Active'; })
    .forEach(function(r) {
      if (remaining <= 0) return;
      var bal = parseFloat(r['คงเหลือ']) || 0;
      var pay = Math.min(remaining, bal);
      var newPaid = (parseFloat(r['ชำระแล้ว']) || 0) + pay;
      var newBal = bal - pay;
      remaining -= pay;

      sh.getRange(r._row, headers.indexOf('ชำระแล้ว') + 1).setValue(newPaid.toFixed(2));
      sh.getRange(r._row, headers.indexOf('คงเหลือ') + 1).setValue(newBal.toFixed(2));
      if (newBal <= 0) sh.getRange(r._row, headers.indexOf('สถานะ') + 1).setValue('Paid');
    });
}
