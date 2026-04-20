# PetGround

## 交付前必须做的准备

在把系统交给客户测试前，请先完成以下 3 项（非常重要）：

1. **立即修改 Admin 默认密码**
   - 默认账号：
   - 默认密码：
   - 交付前必须改成你自己的强密码（至少 12 位，建议包含大小写+数字+符号）

2. **配置你自己的 Resend API Key**
   - 当前项目是开发测试配置，正式交付请替换为你自己的 `RESEND_API_KEY`
   - 同时确认 `RESEND_FROM` 是你在 Resend 已验证的发件域名/邮箱

3. **配置你自己的域名和环境变量**
   - 前端域名：用于客户访问网站
   - 后端域名：用于 API 与图片访问
   - 必填变量：`MONGODB_URI`、`JWT_SECRET`、`RESEND_API_KEY`、`CLIENT_URL`、`API_PUBLIC_URL`

> 安全提醒：请勿将真实 `.env` 上传到 GitHub。仓库中只保留 `.env.example` 模板。

## Overview

PetGround is a modern web application that streamlines the pet grooming appointment booking process. It provides a seamless digital solution for both pet owners and groomers, eliminating the need for manual scheduling through messaging apps.

### Key Benefits

#### For Pet Owners

- Real-time appointment booking with instant confirmation
- View and manage appointments at your convenience
- Track pet grooming history and special instructions
- Automated reminders and notifications

#### For Groomers

- Digital schedule management with calendar view
- Automated availability tracking and time block management
- Business hours and appointment conflict prevention
- Streamlined client communication and service tracking

The application features a dual-interface system, with separate dashboards for pet owners and groomers, ensuring each user type has access to the tools they need while maintaining appropriate access controls.

## Technology Stack

- **Frontend**: Modern React frontend leveraging Vite for fast development and optimized builds, TypeScript for type safety, and shadcn/ui for accessible, customizable components.
- **Backend**: Node.js/Express REST API
- **Database**: MongoDB (utilized MongoDB Atlas)
- **Authentication**: JWT-based authentication
- **Deployment**: Frontend (client2) deployed on Vercel, Backend (server) deployed on Render

## Features

- **Dual User System**: Separate interfaces for pet owners and groomers
- **Pet Profiles**: Create and manage basic pet information
- **Fixed Service Options**: Two service types with preset durations
- **Appointment Scheduling**: Book appointments based on groomer availability
- **Appointment Management**: Cancel or reschedule appointments with time restrictions
- **Groomer Controls**: Groomers can view appointments and manage their schedule by blocking time off
- **Basic Notifications**: Toast notifications for booking confirmations and rescheduling
- **Email Notifications**: Email notifications for both owners and groomers

## Live URL

- **[petground.vercel.app](https://petground.vercel.app)** (update this link to match your Vercel deployment URL) — revamped UI using TypeScript + shadcn [client2]

Frontend deployed on Vercel. Backend is hosted separately on Render.

## Screenshot

![Landing Page](./assets/screenshots/v2-home.png)
_Landing Page_

![Login Page](./assets/screenshots/v2-login.png)
_Login Page_

![Owner Dashboard](./assets/screenshots/v2-ownerdash.png)
_Owner Dashboard - after initial setup by adding pet(s), users (pet owners) should be able to manage appointments all from this page_

![Booking Form](./assets/screenshots/v2-bookingform.png)
_Booking Form - users (pet owners) able to view available time slots of their preferred groomer and add pet-specific instructions which will be passed on to groomers_

![Booking Summary](./assets/screenshots/v2-bookingsummary.png)
_Booking Summary - users (pet owners) able to view a summary of their booking before confirmation_

![Booking Confirmation](./assets/screenshots/v2-bookingconfirmation.png)
_Booking Confirmation - quick 2s screen to show booking confirmation, users will also see a toast showing confirmation and will also receive notification email with their booking details_

![Groomer Dashboard](./assets/screenshots/v2-groomerdash.png)
_Groomer Dashboard - users (groomers) have an at-a-glance view of their appointments for the day, also able to click individual appointments to view incoming pet details_

![Groomer Calendar](./assets/screenshots/v2-groomercal.png)
_Groomer Calendar - users (groomers) able to view their appointments in a calendar format and block time off_

## User Stories

### Authentication & User Management

#### As a new user (pet owner)

- I want to register for an account so that I can book grooming appointments
- I want to log in to my account so that I can access the booking system

#### As a new user (groomer)

- I want to register as a groomer so I can provide grooming services
- I want to log in to my account to view my schedule and manage my availability

### Pet Management

#### As a pet owner

- I want to add a new pet to my profile so I can book appointments for them
- I want to view all my pets in one place for easy management
- I want to see my pet's grooming history to track previous services
- I want to be able to update instructions my pets so that they will be well cared for during appointments

### Appointment Management

#### As a pet owner

- I want to select from various grooming options - currently only 2, Basic (60 mins) and Full (120 mins)
- I want to see a list of upcoming appointments to remember when to bring my pet
- I want to see a list of past appointments to track my pet's grooming history
- I want to know what time slots are available for my preferred groomer
- I want to to be able to reschedule an appointment (more than 24 hours before the start time)
- I want to to be able to cancel an appointment (more than 24 hours before the start time)
- I want to be see/receive notifications when managing my appointments

#### As a groomer

- I want to see my daily schedule of appointments to prepare for my day
- I want to see my past and future appointments to track my work history
- I want to view details of pets for upcoming appointments to better prepare for the session

### Availability

#### As a groomer

- I want to be able to manage my availability by setting my work hours/days.

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- MongoDB Atlas account (for database)

### Installation

1. Clone the repository

   ```
   git clone https://github.com/kenzychew/pet-app.git
   cd pet-app
   ```

2. Install dependencies

   ```
   npm install
   ```

3. Create a .env file in the root directory with the following variables:

   ```
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   ```

4. Start the development server

   ```
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:3000`

## Project Structure

```
pet-app/
├── client2/              # Frontend React application (TypeScript + Vite)
│   ├── public/          # Static assets
│   │   ├── components/  # Reusable UI components (shadcn/ui)
│   │   ├── hooks/      # Custom React hooks for data fetching and state management
│   │   ├── layout/     # Layout components and page transitions
│   │   ├── pages/      # Page components and routing
│   │   ├── services/   # API service calls and data fetching
│   │   ├── store/      # State management (Zustand)
│   │   ├── types/      # TypeScript type definitions
│   │   └── utils/      # Utility functions and helpers
│   ├── components.json # shadcn/ui configuration
│   └── tailwind.config.js # Tailwind CSS configuration
├── server/              # Backend Express application
│   ├── controllers/    # Request handlers and business logic
│   ├── middleware/     # Express middleware (auth, role checks)
│   ├── models/         # MongoDB models and schemas
│   ├── routes/         # API route definitions
│   ├── services/       # Business logic and external service integration
│   └── utils/          # Utility functions and helpers
└── README.md
```

## 维护说明（给日常运营人员）

这一章是给“非技术同事”用的：只需要知道改哪里，不需要懂代码。

### 1) 如何修改价格

- 价格页面位置：`client2/src/pages/ServiceRatesPage.tsx`
- 实际价格文案文件（建议只改这里）：
  - 中文：`client2/src/locales/zh/services.json`
  - 英文：`client2/src/locales/en/services.json`
- 修改建议：
  - 统一使用 `RM`（例如 `RM85`）
  - 中英文两份都要同步修改，避免显示不一致

### 2) 如何修改服务项目名称/说明

- 常用文案文件：
  - `client2/src/locales/zh/booking.json`
  - `client2/src/locales/en/booking.json`
  - `client2/src/locales/zh/services.json`
  - `client2/src/locales/en/services.json`
- 如果只是改“显示文字”（例如改服务名字），改上述 JSON 即可。
- 如果要“新增服务类型”，需要开发人员同步修改后端规则：`server/models/Appointment.js`

### 3) 如何修改促销图片和宠物头像

- 促销图片上传后保存到：`client2/public/uploads/promotions/`
- 宠物头像上传后保存到：`client2/public/uploads/pets/`
- 当前限制：图片最大 5MB（支持常见格式）
- 注意：本地磁盘存图适合小规模测试；正式长期运行建议迁移到对象存储（如 Cloudflare R2 / Vercel Blob）

### 4) 如何安全管理账号和密钥

- 真实密钥只放在 `server/.env`，不要上传到 GitHub
- 仓库中只保留模板：`server/.env.example`
- 新增变量时：同步更新 `.env.example`，但不要写真实值

## 部署指南（交付版）

### A. 前端部署（Vercel）

1. 登录 Vercel 并导入仓库
2. 选择前端目录：`client2`
3. 构建设置：
   - Install Command: `npm install`
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. 在 Vercel 环境变量中新增：
   - `VITE_API_URL=https://你的后端域名/api`
5. 部署成功后，记下前端域名（稍后填到后端 `CLIENT_URL`）

### B. 后端部署（Railway / Render）

1. 新建 Node.js 服务并选择目录：`server`
2. 启动命令使用 `npm start`
3. 在平台环境变量中配置（必须）：
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `RESEND_API_KEY`
   - `RESEND_FROM`
   - `CLIENT_URL`（填前端正式域名）
   - `API_PUBLIC_URL`（填后端正式域名）
   - `NODE_ENV=production`
4. 部署后访问 `https://你的后端域名/health`，确认返回正常

### C. 部署后必须检查（10 分钟清单）

1. 是否能正常登录（Owner / Groomer / Admin）
2. 是否能正常注册并收到验证邮件
3. 是否能正常创建预约、取消预约
4. 图片是否可访问：
   - `https://后端域名/uploads/promotions/xxx`
   - `https://后端域名/uploads/pets/xxx`
5. 邮件中的链接是否跳转到正确前端域名

### D. 图片存储建议（正式环境）

- 目前系统使用本地磁盘上传目录，适合测试和小规模部署
- 正式上线建议迁移对象存储：
  - Cloudflare R2
  - Vercel Blob
- 迁移目标：数据库只存图片 URL，不依赖服务器本地文件

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user (owner or groomer)
- `POST /api/auth/login` - User login
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password/:token` - Reset password with token
- `GET /api/auth/me` - Get current user details (protected)

### Pet Management

- `GET /api/pets` - Get all pets for the current user (owner only)
- `GET /api/pets/deleted` - Get soft-deleted pets (owner only)
- `GET /api/pets/:id` - Get a specific pet by ID
- `POST /api/pets` - Create a new pet (owner only)
- `PUT /api/pets/:id` - Update a pet (owner only)
- `DELETE /api/pets/:id` - Soft delete a pet (owner only)
- `PUT /api/pets/:id/restore` - Restore a soft-deleted pet (owner only)
- `GET /api/pets/:id/appointments` - Get appointments for a specific pet

### Groomer Management

- `GET /api/groomers` - List all available groomers
- `GET /api/groomers/:id` - Get details for a specific groomer
- `GET /api/groomers/:id/availability` - Get available slots for a groomer
- `GET /api/groomers/:id/schedule` - Get groomer's schedule (calendar view)
- `POST /api/groomers/time-blocks` - Create time block (groomer only)
- `PUT /api/groomers/time-blocks/:timeBlockId` - Update time block (groomer only)
- `DELETE /api/groomers/time-blocks/:timeBlockId` - Delete time block (groomer only)

### Appointments

- `POST /api/appointments` - Book a new appointment (owner only)
- `GET /api/appointments` - Get all appointments for the current user
- `GET /api/appointments/:id` - Get a specific appointment by ID
- `PUT /api/appointments/:id` - Update appointment (owner only)
- `DELETE /api/appointments/:id` - Cancel appointment (owner only)
- `GET /api/appointments/available-slots/:groomerId` - Get available slots for a groomer

## Database Schema

### Users

- `_id`: ObjectId
- `email`: String (unique)
- `password`: String (hashed)
- `name`: String
- `role`: String (owner/groomer)
- `createdAt`: Date

### Pets

- `_id`: ObjectId
- `name`: String
- `species`: String
- `breed`: String
- `age`: Number
- `ownerId`: ObjectId (reference to User)
- `notes`: String
- `createdAt`: Date
- `updatedAt`: Date

### Appointments

- `_id`: ObjectId
- `petId`: ObjectId (reference to Pet)
- `ownerId`: ObjectId (reference to User)
- `groomerId`: ObjectId (reference to User)
- `serviceType`: String (basic/full)
- `duration`: Number (60 or 120 minutes)
- `startTime`: Date
- `endTime`: Date
- `status`: String (confirmed/cancelled/completed)
- `createdAt`: Date
- `updatedAt` : Date

#### Appointment Methods

- **Instance Methods**:

  - `canModify()`: Checks if appointment can be modified (>24h before start time)
  - `shouldBeCompleted()`: Checks if appointment should be marked as completed based on end time

- **Static Methods**:

  - `isBusinessDay(date)`: Checks if a given date is a business day
  - `getBusinessHours(date)`: Returns business hours for a specific day
  - `updateCompletedAppointments(appointments)`: Updates status of confirmed/in-progress appointments that have ended
  - `checkForConflicts(groomerId, startTime, endTime, excludeAppointmentId)`: Checks for time conflicts with existing appointments
  - `getGroomerConfirmedAppointments(groomerId, date)`: Gets all confirmed appointments for a groomer on a given day
  - `getAvailableTimeSlots(groomerId, date, duration)`: Generates available time slots based on:
    - Business hours
    - Existing appointments
    - Groomer time blocks
    - Past time slots

- **TimeBlock Methods**:

  - `getGroomerTimeBlocks(groomerId, date)`: Gets all time blocks for a groomer on a specific date
  - `checkForTimeBlockConflicts(groomerId, startTime, endTime, excludeBlockId)`: Checks for conflicts with existing time blocks

- **Business Hours Configuration**:
  - Sunday: 10am-7pm MYT
  - Monday: 11am-8pm MYT
  - Tuesday: 11am-8pm MYT
  - Wednesday: Closed
  - Thursday: 11am-8pm MYT
  - Friday: 11am-8pm MYT
  - Saturday: 10am-7pm MYT

## Service Structure

- **Service Types as Appointment Properties**:

  - Basic Grooming: 60 minutes duration
  - Full Grooming: 120 minutes duration
  - Selected at the time of booking as a property of the appointment

- **Groomer Availability**:
  - All groomers provide both basic and full grooming services
  - All groomers are available from during business hours by default (Weekdays: 11am - 8pm, Weekends: 10am - 7pm)
  - Groomer able to use time block feature to set their recurring off hours (lunch, maintenance etc)

## Appointment Rules

- **Creation**:

  - Only pet owners can create bookings
  - System must check for existing appointments to avoid conflicts
  - Subject to groomer's available timeslots
  - Owners receive confirmation upon successful booking, notification emails sent to both parties (owner and groomer)

- **Updates**:

  - Only allowed more than 24 hours before the appointment
  - Subject to groomer's available timeslots
  - Updates by owners are reflected on the groomer's dashboard and notification emails sent to both parties (owner and groomer)

- **Cancellation**:

  - Only allowed more than 24 hours before the appointment
  - Cancellations by owners are reflected on the groomer's dashboard - current logic uses a delete, but it may make more sense for cancellations to be updated as a status for appointments (soft delete) in order for groomers to better track cancellations

- **Status Types**:
  - Confirmed
  - In Progress
  - Completed

## Future Enhancements (Post-MVP)

- Payment processing integration (perhaps by collecting a booking fee with the rest payable upon completion, may deter users though)
- Customer reviews and ratings
- Advanced reporting and analytics (CRM for groomers, add value to their business)
- Groomers able to send a service completion notification email to users with before and after pictures
- SMS notifications (super useful for a booking service but twilio free trial requires numbers to be verified)
