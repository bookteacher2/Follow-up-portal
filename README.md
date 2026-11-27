# 24X CEO Follow-up: วิธีเปิดใช้บนเว็บ (ฟรี)

ชุดนี้คือ portal ตัวเดียวกับที่ใช้ใน Claude แต่ย้ายมาอยู่บนเว็บของเราเอง
- หน้าเว็บ: GitHub Pages (`bookteacher2.github.io/Follow-up-portal`)
- ข้อมูลและ login: Firebase (แผนฟรี Spark)
- ค่าใช้จ่าย: 0 บาท ถ้าไม่กด Upgrade และไม่ผูกบัตรเครดิต

## ไฟล์ในชุดนี้

| ไฟล์ | ใช้ทำอะไร |
|---|---|
| `index.html` | ตัว portal (หน้าจอเหมือนเดิมทุกอย่าง) |
| `admin.html` | หน้า Admin: รายชื่อคนที่เข้าได้, ตั้ง CEO Office / CEO approver, Import ข้อมูล |
| `config.js` | **ไฟล์เดียวที่ต้องแก้**: ใส่ค่า Firebase และอีเมลเจ้าของระบบ |
| `fb-adapter.js` | ตัวเชื่อม portal กับ Firebase (ไม่ต้องแก้) |
| `firestore.rules` | กฎความปลอดภัย: ใครอ่าน/เขียนอะไรได้ (copy ไปวางใน Firebase) |

---

## ขั้นที่ 1: สร้าง Firebase (30 นาที, ครั้งเดียว)

Login ด้วย `ceooffice.24slg@gmail.com`

1. เข้า https://console.firebase.google.com กด **Create a project** ตั้งชื่อ `24x-followup` ปิด Google Analytics > Create
2. **Build > Firestore Database > Create database**
   - Edition: **Standard**
   - Location: **asia-southeast3 (Bangkok)** ถ้าไม่มีให้เลือก asia-southeast1 (Singapore) (เปลี่ยนภายหลังไม่ได้)
   - เลือก **Start in production mode** > Create
3. **Build > Authentication > Get started > Sign-in method** เปิด **Email/Password** > Save
4. **Authentication > Settings**
   - User actions: เอาติ๊ก **Enable create (sign-up)** ออก
   - Authorized domains: **Add domain** > `bookteacher2.github.io`
5. **Project settings (รูปเฟือง) > General > Your apps** กดไอคอน `</>` ตั้งชื่อ `portal` (ไม่ต้องติ๊ก Hosting) > Register app
6. Copy ค่าในกรอบ `firebaseConfig` ไว้ใช้ในขั้นที่ 2
7. เช็กมุมล่างซ้ายว่าเป็น **Spark** ห้ามกด Upgrade

## ขั้นที่ 2: แก้ `config.js` (5 นาที)

เปิด `config.js` ด้วย Notepad แล้ววางค่าจากข้อ 6 แทน `PASTE_HERE` ทั้ง 6 บรรทัด
- `ownerEmails` = อีเมลเจ้าของระบบ (CEO Office) ตั้งไว้แล้วเป็น `nutthanit.t@24slg.com` และ `ceooffice.24slg@gmail.com`
- ถ้าเปลี่ยน ownerEmails ต้องแก้รายชื่อใน `firestore.rules` บรรทัด `isOwner()` ให้ตรงกันด้วย

## ขั้นที่ 3: วางกฎความปลอดภัย (2 นาที)

1. Firebase > **Firestore Database > Rules**
2. ลบข้อความเดิมทั้งหมด แล้ววางทุกบรรทัดจาก `firestore.rules`
3. กด **Publish**

## ขั้นที่ 4: สร้าง account ของคุณ (2 นาที)

Firebase > **Authentication > Users > Add user**
- Email: `nutthanit.t@24slg.com`
- Password: ตั้งเอง อย่างน้อย 10 ตัวอักษร

## ขั้นที่ 5: Upload ขึ้น GitHub (5 นาที)

1. เปิด repo `bookteacher2/Follow-up-portal`
2. ลบไฟล์ dashboard เดิม (`index2.html` / `index.html` ตัวเก่า) ออกก่อน
3. **Add file > Upload files** ลากไฟล์ทั้ง 5 ไฟล์ (`index.html`, `admin.html`, `config.js`, `fb-adapter.js`, `firestore.rules`) แล้วกด **Commit changes**
4. Settings > Pages ต้องเป็น Branch **main** / **root** (ตั้งไว้แล้ว)
5. รอ 1 ถึง 2 นาที แล้วเปิด `https://bookteacher2.github.io/Follow-up-portal/`

## ขั้นที่ 6: ย้ายข้อมูลจาก portal เดิม (10 นาที)

1. เปิด portal เดิมใน Claude > **Setup** > กด **Export everything for the new site** จะได้ไฟล์ `24x-followup-export-YYYY-MM-DD.json` (มีทุกงาน ประวัติ การตัดสินใจ และไฟล์แนบ)
2. เปิด `.../Follow-up-portal/admin.html` แล้ว login ด้วย account จากขั้นที่ 4
3. หัวข้อ **3 · Import data** เลือกไฟล์จากข้อ 1 > **Import** รอจนขึ้น `Done`
4. เปิด portal ใหม่ เทียบจำนวนงานกับ portal เดิม (ควรเท่ากัน)

> ทำข้อนี้ซ้ำได้ ไม่เกิดข้อมูลซ้ำ ในวันเปิดใช้จริง ให้ทุกคนหยุด update ใน portal เดิม แล้ว Export/Import รอบสุดท้าย

## ขั้นที่ 7: เพิ่มผู้ใช้ (ทำทีละคน)

1. `admin.html` > **1 · Who can sign in** ใส่อีเมลบริษัท บรรทัดละ 1 คน > **Save access list**
2. Firebase > Authentication > **Add user** ใส่อีเมลเดียวกัน และรหัสผ่านชั่วคราว
3. ส่งลิงก์ + อีเมล + รหัสชั่วคราวให้เจ้าตัวทาง chat ส่วนตัว (เปลี่ยนรหัสเองได้ด้วย "Forgot password?" ที่หน้า login)
4. เมื่อ CEO login ครั้งแรกแล้ว: `admin.html` > **2 · Roles** > กด **Set as CEO approver** ที่ชื่อ CEO
5. คนในทีม CEO Office: กด **Make CEO Office** (แก้วันที่ Target ได้, ปิดงานได้)

---

## ใครทำอะไรได้ (บังคับที่ฐานข้อมูล ไม่ใช่แค่หน้าจอ)

| | ดูงาน | Update งาน | แก้ Target date | ยืนยันงานเสร็จ / อนุมัติคำขอ | ตั้งค่า / รายชื่อ |
|---|---|---|---|---|---|
| คนนอกรายชื่อ | ❌ | ❌ | ❌ | ❌ | ❌ |
| PIC | ✅ | ✅ | ❌ (ใส่วันที่คาดว่าจะเสร็จใน Update progress) | ❌ | ❌ |
| CEO Office | ✅ | ✅ | ✅ | ❌ | ❌ (เว้นแต่เป็น owner) |
| CEO approver | ✅ | ✅ | ✅ | ✅ | ❌ |
| Owner (config.js) | ✅ | ✅ | ✅ | ❌ | ✅ |

## งานประจำ

- **ทุกวันศุกร์:** Setup > **Download full backup** > เก็บใน SharePoint `CEO Office / 24X Follow-up Files / Backups` (เก็บ 8 ไฟล์ล่าสุด)
- **ต้นเดือน:** Firebase > Usage เช็ก Firestore reads เฉลี่ยไม่เกิน 30,000/วัน (โควตาฟรี 50,000)
- **คนลาออก:** ลบอีเมลออกจาก access list และ Authentication > Users > Disable account

## ข้อจำกัดที่ควรรู้

- **ไฟล์แนบ:** เก็บใน Firebase ได้ไม่เกิน 5 MB ต่อไฟล์ (รูปถูกย่ออัตโนมัติ) ไฟล์ใหญ่กว่านั้นให้เก็บใน SharePoint แล้วใช้ **Add a link**
- **ค้นหาประชุม Outlook / ส่งอีเมลจากในระบบ:** ใช้ได้เฉพาะตอนเปิดใน Claude บนเว็บนี้จะไม่มีปุ่มเหล่านี้ (ระยะที่ 2: login ด้วย Microsoft 24SLG หลัง IT ลงทะเบียนแอป)
- **การยืนยันของ CEO ใน portal เดิม:** ย้ายมาไม่ได้ ถ้า CEO เคย tick ยืนยันใน Claude ต้องให้ CEO tick ใหม่ในระบบใหม่ (ตอนนี้ยังไม่มีรายการยืนยันของ CEO จึงไม่กระทบ)
- **Restore จาก backup:** คืนได้ทุกอย่าง ยกเว้นการตัดสินใจของคนอื่น (เช่น การยืนยันของ CEO) เพราะระบบให้แต่ละคนบันทึกการตัดสินใจของตัวเองเท่านั้น
- **ถ้าใช้โควตาฟรีเกินในวันใด:** ระบบหยุดรับข้อมูลชั่วคราวจนถึงประมาณ 14:00 ถึง 15:00 ของวันถัดไป (ไม่มีค่าใช้จ่าย)

## Login ด้วย Microsoft (ระยะที่ 2)

1. IT ลงทะเบียนแอปใน Microsoft Entra ID (Accounts in this organizational directory only)
   - Redirect URI: `https://<projectId>.firebaseapp.com/__/auth/handler`
2. Firebase > Authentication > Sign-in method > เปิด **Microsoft** ใส่ Application (client) ID และ Client secret
3. `config.js`: `microsoft: { enabled: true, tenant: "<Directory (tenant) ID>" }` แล้ว upload ไฟล์ใหม่
4. คนในรายชื่อ access list กด "Sign in with Microsoft (24SLG)" ได้เลย ไม่ต้องสร้าง account ใน Firebase
