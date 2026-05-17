// ============================================================
// Loan.gs — Loan Management
// ============================================================

function getLoans(p) {
  var rows = sheetToObjects(getSheet('Loans'));
  if (p && p.empID) rows = rows.filter(function(r) { return r['EmpID'] === p.empID; });
  if (p && p.status) rows = rows.filter(function(r) { return r['สถานะ'] === p.status; });
  return rows.map(function(r) {
    return {
      loanID: r['LoanID'], empID: r['EmpID'], name: r['ชื่อ'],
      date: r['วันที่กู้'], amount: r['ยอดกู้'], monthlyDeduct: r['หักต่องวด'],
      paid: r['ชำระแล้ว'], balance: r['คงเหลือ'],
      status: r['สถานะ'], note: r['หมายเหตุ']
    };
  });
}

function addLoan(d) {
  var sh = getSheet('Loans');
  var loanID = 'L' + Date.now();
  var emps = getEmployees();
  var emp = emps.find(function(e) { return e.empID === d.empID; });
  sh.appendRow([
    loanID, d.empID, emp ? emp.name : d.empID,
    thaiDate(), d.amount, d.monthlyDeduct,
    0, d.amount, 'Active', d.note || ''
  ]);
  return { success: true, loanID: loanID };
}

function updateLoan(d) {
  var sh = getSheet('Loans');
  var rows = sheetToObjects(sh);
  var loan = rows.find(function(r) { return r['LoanID'] === d.loanID; });
  if (!loan) return { error: 'ไม่พบรายการยืมเงิน' };
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  if (d.monthlyDeduct !== undefined)
    sh.getRange(loan._row, headers.indexOf('หักต่องวด') + 1).setValue(d.monthlyDeduct);
  if (d.status !== undefined)
    sh.getRange(loan._row, headers.indexOf('สถานะ') + 1).setValue(d.status);
  if (d.note !== undefined)
    sh.getRange(loan._row, headers.indexOf('หมายเหตุ') + 1).setValue(d.note);
  return { success: true };
}
