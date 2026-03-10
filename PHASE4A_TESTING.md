# 🧪 Phase 4A Testing Guide

## Prerequisites

### 1. Database Setup
First, run the price history migration in Supabase:

```sql
-- Go to Supabase Dashboard → SQL Editor
-- Run the migration file: supabase/migrations/006_price_history.sql
```

Or copy this SQL directly:

```sql
CREATE TABLE IF NOT EXISTS public.price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.inventories(id) ON DELETE CASCADE,
  old_price BIGINT,
  new_price BIGINT NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  change_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_history_vehicle_id ON public.price_history(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_price_history_created_at ON public.price_history(created_at DESC);

ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view price history"
  ON public.price_history FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert price history"
  ON public.price_history FOR INSERT TO authenticated WITH CHECK (true);

GRANT ALL ON public.price_history TO authenticated;
GRANT ALL ON public.price_history TO service_role;
```

### 2. Start Development Server

```bash
cd D:\Project\Carbey
npm run dev
```

Open: `http://localhost:3000`

---

## Test Suite

### ✅ Test 1: Vehicle Edit Page

#### Steps:
1. **Navigate to Inventory**
   - Go to: `http://localhost:3000/admin/inventory`
   - You should see the inventory list

2. **Open Vehicle Detail**
   - Click on any vehicle to view details
   - You should see vehicle information

3. **Click Edit Button**
   - Look for blue "編集" button (top right)
   - Click it
   - Should navigate to: `/admin/inventory/[id]/edit`

4. **Verify Form Loads**
   - ✅ Form should display with all vehicle data
   - ✅ All 7 sections should be visible:
     - 基本情報 (Basic Info)
     - 価格情報 (Pricing)
     - ステータス (Status)
     - 車両仕様 (Specifications)
     - 追加情報 (Additional Details)
     - 販売店情報 (Store Info)

5. **Test Form Editing**
   - Change vehicle name
   - Change price
   - Change status
   - Modify specifications
   - Add notes

6. **Test Save**
   - Click "保存" button
   - ✅ Should show loading state
   - ✅ Should redirect to vehicle detail page
   - ✅ Changes should be visible

7. **Test Cancel**
   - Click edit again
   - Make changes
   - Click "キャンセル"
   - ✅ Should return to detail page
   - ✅ Changes should not be saved

#### Expected Results:
- ✅ Form loads with current data
- ✅ All fields are editable
- ✅ Save updates database
- ✅ Cancel discards changes
- ✅ Validation works (required fields)

---

### ✅ Test 2: Quick Status Change

#### Steps:
1. **From Vehicle Detail Page**
   - Find the status badge (green/red/gray)
   - It should be a dropdown

2. **Change Status**
   - Click the status dropdown
   - Select a different status:
     - 販売中 (For Sale) - Green
     - 売約済 (Sold) - Red
     - 非公開 (Private) - Gray

3. **Verify Update**
   - ✅ Dropdown should show loading spinner
   - ✅ Color should change immediately
   - ✅ Page refreshes automatically
   - ✅ Status persists after refresh

4. **Test Multiple Changes**
   - Change status back and forth
   - Each change should update immediately

#### Expected Results:
- ✅ Status changes instantly
- ✅ Visual feedback during save
- ✅ No page reload required
- ✅ Data persists in database

---

### ✅ Test 3: Price Editing with History

#### Steps:
1. **Trigger Price Edit** (Implementation needed)
   - For now, we need to add a button to open the modal
   - Let me create a quick test component...

Actually, I need to add the price edit button to the vehicle detail page first. Let me do that:

```typescript
// Add this to the vehicle detail page
// We'll integrate it in the next step
```

For now, you can test the component directly by:

2. **Manual Test Setup**
   - Import and use `PriceEditModal` in a test page
   - Or add it to vehicle detail page (I'll do this below)

Let me add the price edit functionality to the vehicle detail page:

---

## 🔧 Adding Price Edit Button

I'll create an enhanced version with the price edit modal integrated.

---

### ✅ Test 4: Database Verification

#### Steps:
1. **Check Supabase Dashboard**
   - Go to your Supabase project
   - Navigate to Table Editor
   - Select `inventories` table

2. **Verify Updates**
   - After making edits, refresh the table
   - ✅ Changes should appear in database
   - ✅ `updated_at` timestamp should be current

3. **Check Price History**
   - Select `price_history` table
   - ✅ Should see entries for each price change
   - ✅ Old price, new price, reason should be recorded
   - ✅ Timestamp should be accurate

---

## 🐛 Common Issues & Solutions

### Issue 1: Edit Page 404
**Problem:** Can't access edit page  
**Solution:** 
- Check route: `/admin/inventory/[vehicle-id]/edit`
- Verify vehicle ID is valid UUID
- Check browser console for errors

### Issue 2: Form Not Saving
**Problem:** Click save but nothing happens  
**Solution:**
- Open browser DevTools (F12)
- Check Console tab for errors
- Verify Supabase credentials in `.env`
- Check Network tab for failed requests

### Issue 3: Status Not Changing
**Problem:** Dropdown doesn't update  
**Solution:**
- Check browser console for errors
- Verify RLS policies in Supabase
- Check user is authenticated
- Verify `inventories` table has `updated_at` column

### Issue 4: Price History Not Recording
**Problem:** Price changes but no history  
**Solution:**
- Verify `price_history` table exists
- Check RLS policies are set
- Look for errors in browser console
- Verify foreign key constraints

---

## 📊 Test Checklist

Use this checklist to verify all features:

### Vehicle Edit Form
- [ ] Edit page loads
- [ ] All sections display
- [ ] Form has correct data
- [ ] Can modify text fields
- [ ] Can change dropdowns
- [ ] Can update numbers
- [ ] Can edit checkboxes
- [ ] Required fields validated
- [ ] Save button works
- [ ] Cancel button works
- [ ] Redirects after save
- [ ] Changes persist

### Status Change
- [ ] Dropdown appears
- [ ] Shows current status
- [ ] Can select new status
- [ ] Loading indicator shows
- [ ] Status updates immediately
- [ ] Color changes correctly
- [ ] Page refreshes
- [ ] Change persists

### Price History (when button added)
- [ ] Modal opens
- [ ] Shows current price
- [ ] Can enter new price
- [ ] Shows price difference
- [ ] Shows percentage change
- [ ] Can add reason
- [ ] Save button works
- [ ] History is recorded
- [ ] Can view history

### Database
- [ ] Updates appear in Supabase
- [ ] Timestamps are current
- [ ] Price history entries exist
- [ ] No duplicate entries
- [ ] Data integrity maintained

---

## 🔍 Debugging Tips

### Enable Verbose Logging

Add to browser console:
```javascript
// See all Supabase operations
localStorage.setItem('supabase.debug', 'true')
```

### Check Network Requests

1. Open DevTools (F12)
2. Go to Network tab
3. Filter: `supabase`
4. Look for:
   - POST requests (inserts)
   - PATCH requests (updates)
   - Status codes (200 = success)

### View Console Errors

1. Open DevTools (F12)
2. Console tab
3. Look for red errors
4. Check error messages

---

## 📸 Visual Verification

### Edit Page Should Show:
```
┌─────────────────────────────────────┐
│  車両情報の編集                      │
│  Toyota Corolla Sport              │
│                          [編集]     │
├─────────────────────────────────────┤
│  基本情報                            │
│  [メーカー] [車名] [グレード]       │
├─────────────────────────────────────┤
│  価格情報                            │
│  [本体価格] [総額]                  │
├─────────────────────────────────────┤
│  ... more sections ...              │
├─────────────────────────────────────┤
│           [キャンセル] [保存]       │
└─────────────────────────────────────┘
```

### Status Dropdown Should Show:
```
┌──────────┐
│ 販売中 ▼ │  ← Green badge, clickable
└──────────┘

When clicked:
┌──────────┐
│ 販売中   │  ← Selected
│ 売約済   │
│ 非公開   │
└──────────┘
```

---

## 🎯 Success Criteria

Phase 4A is working correctly if:

✅ **All edit features functional**
- Can edit any vehicle field
- Changes save to database
- Form validation works
- UI provides feedback

✅ **Status changes work**
- Quick status updates
- Real-time UI updates
- Data persists

✅ **Price tracking ready**
- History table exists
- Can record changes
- Audit trail maintained

✅ **No errors**
- No console errors
- No failed network requests
- No database errors
- No TypeScript errors

---

## 📝 Test Report Template

Use this to document your testing:

```markdown
## Phase 4A Test Results

**Date:** [Date]
**Tester:** [Name]
**Environment:** Local Dev / Staging / Production

### Vehicle Edit Form
- Status: ✅ Pass / ❌ Fail
- Issues: [Describe any issues]
- Notes: [Any observations]

### Status Change
- Status: ✅ Pass / ❌ Fail  
- Issues: [Describe any issues]
- Notes: [Any observations]

### Database Verification
- Status: ✅ Pass / ❌ Fail
- Issues: [Describe any issues]
- Notes: [Any observations]

### Overall Result
- [ ] Ready for Production
- [ ] Needs Fixes
- [ ] Blocked by: [Issue]
```

---

## 🚀 Ready to Test!

1. **Start server:** `npm run dev`
2. **Run migration:** Execute SQL in Supabase
3. **Follow test steps:** Use checklist above
4. **Report issues:** Document any problems

**Need help?** Check the troubleshooting section or ask! 🎯
