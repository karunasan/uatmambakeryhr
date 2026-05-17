// ============================================================
// Attendance.gs — Clock In / Clock Out
// ============================================================

function clockIn(d) {
  var today = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy');
  var sh = getSheet('Attendance');
  var rows = sheetToObjects(sh);

  // ตรวจสอบว่าเช็คอินวันนี้แล้วหรือยัง
  var existing = rows.find(function(r) {
    return r['EmpID'] === d.empID && r['วันที่'] === today;
  });
  if (existing) {
    return { error: 'เช็คอินวันนี้แล้ว (' + existing['เวลาเข้า'] + ')' };
  }

  var now = new Date();
  var timeStr = fmtTime(now);
  sh.appendRow([
    today, d.empID, d.name,
    timeStr, '', '', 'เข้างาน',
    d.gps || '', ''
  ]);
  return { success: true, time: timeStr, action: 'in' };
}

function clockOut(d) {
  var today = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy');
  var sh = getSheet('Attendance');
  var rows = sheetToObjects(sh);

  var existing = rows.find(function(r) {
    return r['EmpID'] === d.empID && r['วันที่'] === today && r['เวลาออก'] === '';
  });
  if (!existing) {
    return { error: 'ไม่พบการเช็คอินวันนี้ หรือเช็คเอาท์แล้ว' };
  }

  var now = new Date();
  var timeOut = fmtTime(now);

  // คำนวณชั่วโมงทำงาน
  var parts = existing['เวลาเข้า'].split(':');
  var inMin = parseInt(parts[0]) * 60 + parseInt(parts[1]);
  var outParts = timeOut.split(':');
  var outMin = parseInt(outParts[0]) * 60 + parseInt(outParts[1]);
  var totalHours = ((outMin - inMin) / 60).toFixed(2);

  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var outCol = headers.indexOf('เวลาออก') + 1;
  var hrCol = headers.indexOf('ชั่วโมงรวม') + 1;
  var stCol = headers.indexOf('สถานะ') + 1;
  var gpsCol = headers.indexOf('GPS_ออก') + 1;

  sh.getRange(existing._row, outCol).setValue(timeOut);
  sh.getRange(existing._row, hrCol).setValue(parseFloat(totalHours));
  sh.getRange(existing._row, stCol).setValue('ออกงาน');
  sh.getRange(existing._row, gpsCol).setValue(d.gps || '');

  return { success: true, time: timeOut, hours: totalHours, action: 'out' };
}

function getTodayStatus(empID) {
  var today = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy');
  var rows = sheetToObjects(getSheet('Attendance'));
  var rec = rows.find(function(r) {
    return r['EmpID'] === empID && r['วันที่'] === today;
  });
  if (!rec) return { status: 'none' };
  if (rec['เวลาออก']) return { status: 'out', checkIn: rec['เวลาเข้า'], checkOut: rec['เวลาออก'] };
  return { status: 'in', checkIn: rec['เวลาเข้า'] };
}

function getAttendance(p) {
  var rows = sheetToObjects(getSheet('Attendance'));
  if (p.empID) rows = rows.filter(function(r) { return r['EmpID'] === p.empID; });
  if (p.month) { // format: MM/YYYY
    var parts = p.month.split('/');
    var mm = parts[0], yyyy = parseInt(parts[1]) - 543; // convert from BE to CE if needed
    // วันที่ format: dd/MM/BBBB (พ.ศ.)
    rows = rows.filter(function(r) {
      var dp = (r['วันที่'] || '').split('/');
      return dp[1] === mm && dp[2] === parts[1];
    });
  }
  if (p.date) rows = rows.filter(function(r) { return r['วันที่'] === p.date; });

  return rows.map(function(r) {
    return {
      date: r['วันที่'], empID: r['EmpID'], name: r['ชื่อ'],
      checkIn: r['เวลาเข้า'], checkOut: r['เวลาออก'],
      hours: r['ชั่วโมงรวม'], status: r['สถานะ'],
      gpsIn: r['GPS_เข้า'], gpsOut: r['GPS_ออก']
    };
  });
}

// เรียกใช้ใน Payroll: นับวันทำงานในงวด
function getWorkdaysInPeriod(empID, dateFrom, dateTo) {
  var rows = sheetToObjects(getSheet('Attendance'));
  var filtered = rows.filter(function(r) {
    if (r['EmpID'] !== empID) return false;
    if (!r['เวลาออก']) return false; // เฉพาะที่ออกงานแล้ว
    // compare date strings dd/MM/BBBB — ต้องแปลงเป็นวันที่ก่อน
    var dp = (r['วันที่'] || '').split('/');
    if (dp.length < 3) return false;
    var recDate = new Date(parseInt(dp[2]) - 543, parseInt(dp[1]) - 1, parseInt(dp[0]));
    return recDate >= dateFrom && recDate <= dateTo;
  });
  var totalHours = filtered.reduce(function(sum, r) {
    return sum + (parseFloat(r['ชั่วโมงรวม']) || 0);
  }, 0);
  return { days: filtered.length, hours: totalHours.toFixed(2), records: filtered.length };
}
