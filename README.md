# แหม่มเบเกอรี่ HR Management System

ระบบบริหารงานพนักงานครบวงจรสำหรับร้านแหม่มเบเกอรี่  
Full-stack HR system: Google Apps Script + Google Sheets backend, Face Recognition Kiosk, Admin Panel

---

## โครงสร้างไฟล์ / File Structure

```
maem-bakery-hr/
├── gas/                    # Google Apps Script (Backend)
│   ├── appsscript.json     # GAS manifest
│   ├── Code.gs             # Router + Sheet helpers + Setup
│   ├── Employee.gs         # Employee CRUD + Face descriptor
│   ├── Attendance.gs       # Clock-in/out logic
│   ├── Payroll.gs          # Payroll periods + calculation
│   ├── Loan.gs             # Loan management
│   └── Report.gs           # CSV export
├── kiosk/
│   └── index.html          # Face recognition clock-in kiosk (standalone)
├── admin/
│   └── index.html          # Admin panel (standalone)
└── README.md
```

---

## ขั้นตอนการติดตั้ง / Setup Steps

### ขั้นที่ 1 — ตั้งค่า Google Apps Script

1. ไปที่ [script.google.com](https://script.google.com) แล้วคลิก **New Project**
2. ตั้งชื่อโปรเจกต์: `แหม่มเบเกอรี่ HR`
3. ลบโค้ดเริ่มต้น (`Code.gs` เดิม) ออกทั้งหมด
4. **เพิ่มไฟล์ทีละไฟล์** (คลิก `+` → Script):
   - วางเนื้อหา `Code.gs` ลงใน `Code.gs`
   - สร้างไฟล์ใหม่ชื่อ `Employee` → วางเนื้อหา `Employee.gs`
   - สร้างไฟล์ใหม่ชื่อ `Attendance` → วางเนื้อหา `Attendance.gs`
   - สร้างไฟล์ใหม่ชื่อ `Payroll` → วางเนื้อหา `Payroll.gs`
   - สร้างไฟล์ใหม่ชื่อ `Loan` → วางเนื้อหา `Loan.gs`
   - สร้างไฟล์ใหม่ชื่อ `Report` → วางเนื้อหา `Report.gs`
5. คลิก ⚙️ **Project Settings** → เปิด **Show `appsscript.json`**
6. แทนที่เนื้อหา `appsscript.json` ด้วยไฟล์ในโฟลเดอร์ `gas/`

### ขั้นที่ 2 — Deploy เป็น Web App

1. คลิก **Deploy** → **New deployment**
2. เลือก Type: **Web app**
3. ตั้งค่า:
   - Description: `HR v1`
   - Execute as: **Me**
   - Who has access: **Anyone** *(จำเป็นสำหรับ kiosk และ admin panel)*
4. คลิก **Deploy** → อนุญาต permissions ที่ขอ
5. **คัดลอก Web App URL** (รูปแบบ: `https://script.google.com/macros/s/XXXX/exec`)

### ขั้นที่ 3 — เริ่มต้น Google Sheets

1. กลับไปที่ Apps Script editor
2. เลือก function `setupSheets` จาก dropdown (ด้านบน)
3. คลิก ▶️ **Run** — รอสักครู่ จะสร้าง Google Sheet และ sheet ทุกแผ่น
4. ไปที่ [Google Drive](https://drive.google.com) → เปิด **แหม่มเบเกอรี่ HR** spreadsheet เพื่อตรวจสอบ

> **หมายเหตุ:** `setupSheets()` สร้าง sheet ดังนี้: Employees, Attendance, PayrollPeriods, PayrollDetail, ManualDeductions, Loans, Config
> Config เริ่มต้น: รหัสผ่าน `admin1234`, ค่าอาหาร 50 บาท/วัน, OT ×1.5

### ขั้นที่ 4 — ตั้งค่า Admin Panel

1. เปิด `admin/index.html` ในเบราว์เซอร์
2. Login ด้วยรหัสผ่าน: **`admin1234`**
3. ไปที่แท็บ **⚙️ ตั้งค่าระบบ**
4. ใส่ **GAS API URL** ที่คัดลอกในขั้นที่ 2 → คลิก **ทดสอบการเชื่อมต่อ**
5. ตั้งค่า GPS (latitude/longitude ของร้าน, รัศมี เช่น 100 เมตร)
6. ปรับค่าเงินเดือนตามต้องการ → **บันทึกการตั้งค่า**
7. **เปลี่ยนรหัสผ่าน** จาก `admin1234` เป็นรหัสส่วนตัว

### ขั้นที่ 5 — ตั้งค่า Kiosk

1. เปิด `kiosk/index.html` บน tablet หรือ laptop ที่หน้าร้าน
2. ระบบจะขอตั้งค่า GAS URL (ดึงจาก localStorage เดียวกับ admin หากใช้เครื่องเดียวกัน)
3. ตั้งค่า GPS ให้ตรงกับพิกัดร้าน
4. **ลงทะเบียนใบหน้าพนักงาน** ผ่าน Admin Panel → แท็บ **ลงทะเบียนใบหน้า** ก่อน
5. กด F11 เพื่อ Fullscreen mode

---

## การใช้งาน / Usage Guide

### Kiosk (หน้าร้าน)
- พนักงานยืนหน้ากล้อง → ระบบตรวจจับใบหน้าอัตโนมัติ
- รอ 3 วินาที → บันทึกเวลาเข้า/ออก อัตโนมัติ
- หากไม่มีอินเทอร์เน็ต → บันทึกใน queue และซิงก์ภายหลัง

### Admin Panel
| แท็บ | ฟีเจอร์ |
|------|---------|
| แดชบอร์ด | สถิติวันนี้, ตารางเข้างาน |
| จัดการพนักงาน | เพิ่ม/แก้ไข/ปิดการใช้งาน |
| ลงทะเบียนใบหน้า | ถ่าย 3 มุม (ตรง/ซ้าย/ขวา) |
| รายงานการเข้างาน | กรองเดือน/พนักงาน, Export CSV |
| งวดเงินเดือน | สร้างงวด, แก้ไขรายการ, Confirm |
| สลิปเงินเดือน | พิมพ์/PDF รายบุคคล |
| บันทึกยืมเงิน | เพิ่มเงินกู้, ติดตามยอดคงเหลือ |
| ตั้งค่าระบบ | URL, GPS, เงินเดือน, รหัสผ่าน |

---

## การ Push ขึ้น GitHub

```bash
cd maem-bakery-hr
git init
git add .
git commit -m "Initial commit: แหม่มเบเกอรี่ HR System"
git remote add origin https://github.com/YOUR_USERNAME/maem-bakery-hr.git
git branch -M main
git push -u origin main
```

> ⚠️ **ความปลอดภัย:** ไม่มี API key หรือข้อมูลลับในไฟล์ใด ทุกอย่างเก็บใน `localStorage` ของเครื่อง

---

## หมายเหตุทางเทคนิค / Technical Notes

### Face Recognition Models
- ใช้ CDN จาก `@vladmandic/face-api` (โหลดอัตโนมัติ ไม่ต้องดาวน์โหลด)
- สำหรับ **production ที่ไม่มีอินเทอร์เน็ต**: ดาวน์โหลด model weights จาก  
  `https://github.com/vladmandic/face-api/tree/master/model`  
  แล้ววางใน `kiosk/model/` และ `admin/model/` แล้วแก้ path ใน HTML

### Threshold การจำใบหน้า
- ค่าเริ่มต้น: **0.48** (ยิ่งต่ำ ยิ่งเข้มงวด)
- ปรับใน `kiosk/index.html` บรรทัด `FACE_THRESHOLD`

### GPS
- สามารถปิด GPS mode ได้ใน Settings หากร้านไม่ต้องการ
- รัศมีแนะนำ: 50–150 เมตร

### วันที่
- ระบบใช้ **พุทธศักราช (พ.ศ.)** ตลอด
- Format: `dd/MM/BBBB` เช่น `15/05/2568`

---

## Requirements

- Google Account (สำหรับ GAS + Sheets)
- เบราว์เซอร์สมัยใหม่ที่รองรับ: Chrome 90+, Edge 90+, Firefox 88+
- กล้องเว็บแคม (สำหรับ kiosk และลงทะเบียนใบหน้า)
- อินเทอร์เน็ต (kiosk รองรับ offline แบบ queue)

---

*สร้างด้วย ❤️ สำหรับแหม่มเบเกอรี่*
