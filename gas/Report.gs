// ============================================================
// Report.gs — Attendance Reports + CSV Export
// ============================================================

function exportCSV(p) {
  var rows = getAttendance(p);
  if (rows.length === 0) return 'ไม่มีข้อมูล';
  var headers = ['วันที่','EmpID','ชื่อ','เวลาเข้า','เวลาออก','ชั่วโมงรวม','สถานะ'];
  var lines = [headers.join(',')];
  rows.forEach(function(r) {
    lines.push([r.date, r.empID, r.name, r.checkIn, r.checkOut, r.hours, r.status].join(','));
  });
  return '\uFEFF' + lines.join('\n'); // BOM for Excel UTF-8
}
