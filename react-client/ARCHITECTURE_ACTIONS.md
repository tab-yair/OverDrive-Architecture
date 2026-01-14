# ארכיטקטורה מרכזית לניהול פעולות ומצבי כפתורים

## עיקרון מרכזי: Single Source of Truth

המערכת בנויה על עיקרון **מקור אמת יחיד** - כל פעולה מוגדרת במקום אחד, וכל הכפתורים/תפריטים לוקחים משם את המידע.

---

## 🏗️ שכבה 1: הגדרת פעולות (Single Source of Truth)

**קובץ:** `fileUtils.js`  
**אחריות:** הגדרה מרכזית של כל הפעולות במערכת

### ACTION_REGISTRY - המילון המרכזי

```javascript
const ACTION_REGISTRY = {
  details: {
    label: 'Details',
    iconSrc: icons.info,
    isDanger: false,
    
    // האם הפעולה נראית?
    isVisible: (file, pageContext) => {
      return pageContext !== 'Trash';
    },
    
    // האם ניתן ללחוץ על הפעולה?
    isEnabled: (file, pageContext, selectedCount = 1) => {
      return selectedCount <= 1;  // ✅ Details זמינה רק לקובץ אחד
    },
  },
  
  share: {
    label: 'Share',
    iconSrc: icons.share,
    isDanger: false,
    
    isVisible: (file, pageContext) => {
      return pageContext !== 'Trash';
    },
    
    isEnabled: (file, pageContext) => {
      return file.permissionLevel === 'owner';  // ✅ רק בעלים יכולים לשתף
    },
  },
  
  trash: {
    label: (file) => {
      return file.isOwner ? 'Move to Trash' : 'Remove';
    },
    iconSrc: icons.delete,
    isDanger: true,  // ✅ פעולה מסוכנת - צבע אדום
    
    isVisible: (file, pageContext) => {
      return pageContext !== 'Trash';
    },
    
    isEnabled: (file, pageContext) => {
      const permissionLevel = file.permissionLevel || 'viewer';
      return permissionLevel === 'owner' || permissionLevel === 'editor';
    },
  },
  
  // ... כל הפעולות האחרות
};
```

### תכונות כל פעולה:
1. **label** - טקסט הכפתור (יכול להיות פונקציה דינמית)
2. **iconSrc** - אייקון הכפתור
3. **isDanger** - האם פעולה מסוכנת (מחיקה, וכו')
4. **isVisible(file, pageContext)** - האם הפעולה מוצגת בכלל?
5. **isEnabled(file, pageContext, selectedCount)** - האם ניתן ללחוץ עליה?

---

## 🔄 שכבה 2: הערכת פעולות (Evaluation Layer)

### evaluateAction() - פעולה על קובץ יחיד

```javascript
evaluateAction(actionId, file, pageContext, selectedCount)
```

**תפקיד:** מחשבת את המצב המדויק של פעולה עבור קובץ ספציפי

**זרימה:**
```
1. מחפשת את הפעולה ב-ACTION_REGISTRY
2. מריצה isVisible(file, pageContext)
3. מריצה isEnabled(file, pageContext, selectedCount)
4. מחזירה: { isVisible, isEnabled, label, iconSrc, isDanger }
```

**דוגמה:**
```javascript
const status = evaluateAction('details', file, 'MyDrive', 1);
// תוצאה: { isVisible: true, isEnabled: true, label: 'Details', ... }

const status2 = evaluateAction('details', file, 'MyDrive', 3);
// תוצאה: { isVisible: true, isEnabled: false, label: 'Details', ... }
//                                    ↑ מושבת כי בחרנו 3 קבצים!
```

### evaluateBulkAction() - פעולה על מספר קבצים

```javascript
evaluateBulkAction(actionId, files, pageContext)
```

**תפקיד:** מחשבת את המצב של פעולה עבור בחירה מרובה

**לוגיקה: "Most Restrictive Rule"**
- ✅ **isVisible:** רק אם הפעולה זמינה לכל הקבצים
- ✅ **isEnabled:** רק אם לכל הקבצים יש הרשאה

**זרימה:**
```
1. מחשבת selectedCount = files.length
2. מריצה evaluateAction() על כל קובץ עם selectedCount
3. isVisible = true רק אם לכולם true
4. isEnabled = true רק אם לכולם true
```

**דוגמה:**
```javascript
// בחרנו 3 קבצים: 2 שלי, 1 של מישהו אחר (viewer)
evaluateBulkAction('trash', files, 'MyDrive')

// תוצאה:
// isVisible: true  (כולם יכולים לראות את trash)
// isEnabled: false (אחד מהם viewer - אין הרשאה!)
```

---

## 📋 שכבה 3: קבלת רשימות פעולות (Action Lists)

### getAvailableActions() - תפריט More (⋮) של קובץ יחיד

```javascript
getAvailableActions(pageContext, file, selectedCount)
```

**זרימה:**
```
1. קובעת סדר פעולות לפי pageContext (MyDrive/Trash/etc)
2. מריצה evaluateAction() על כל פעולה
3. מסננת: .filter(action => action.isVisible)
4. מחזירה: [{ id, label, iconSrc, enabled, isDanger }]
```

### getToolbarActions() - כפתורים ב-SelectionToolbar

```javascript
getToolbarActions(pageContext, selectedFiles)
```

**זרימה:**
```
1. קוראת ל-getBulkMenuActions() לקבלת כל הפעולות
2. מסננת רק פעולות בעדיפות (share, download, move, trash)
3. מחזירה רק פעולות שגם visible וגם בעדיפות
```

### getBulkMenuActions() - תפריט More (⋮) של בחירה מרובה

```javascript
getBulkMenuActions(pageContext, selectedFiles)
```

**זרימה:**
```
1. קובעת רשימת פעולות אפשריות לפי pageContext
2. מריצה evaluateBulkAction() על כל פעולה
3. מסננת: .filter(action => action.visible)
4. מחזירה: [{ id, label, iconSrc, enabled, isDanger }]
```

---

## 🎨 שכבה 4: רכיבי UI - צריכה אוטומטית

### ActionButton - כפתור עגול בודד

**קובץ:** `ActionButton.js` + `ActionButton.css`

**Props:**
```javascript
<ActionButton
  iconSrc={action.iconSrc}
  onClick={handleClick}
  disabled={!action.enabled}  // ✅ מקבל ישירות מהפעולה!
  ariaLabel={action.label}
  className={action.isDanger ? 'danger-button' : ''}
/>
```

**סטיילינג אוטומטי (ActionButton.css):**
```css
/* ✅ ENABLED - צבע רגיל + hover */
.action-button:hover:not(.disabled) {
  background-color: rgba(95, 99, 104, 0.1);  /* עיגול אפור */
}

/* ✅ DISABLED - מטושטש + ללא אינטראקציה */
.action-button.disabled {
  cursor: default;
  pointer-events: none;  /* ⚡ לא ניתן ללחיצה! */
  background-color: transparent !important;
}

.action-button.disabled .action-button-icon {
  opacity: 0.3;  /* 🌫️ מטושטש! */
}
```

**תוצאה:**
- `disabled={false}` → צבע רגיל, hover עובד ✅
- `disabled={true}` → אפור מטושטש, ללא hover ❌

### FileActionMenu - תפריט More (⋮)

**קובץ:** `FileActionMenu.js` + `FileActionMenu.css`

**JSX:**
```javascript
{actions.map((action) => (
  <button
    className={`file-action-menu-item ${!action.enabled ? 'disabled' : ''}`}
    onClick={() => handleActionClick(action)}
    disabled={!action.enabled}  // ✅ מקבל ישירות!
  >
    <img src={action.iconSrc} />
    <span>{action.label}</span>
  </button>
))}
```

**סטיילינג אוטומטי (FileActionMenu.css):**
```css
/* ✅ ENABLED - hover עובד */
.file-action-menu-item:hover:not(.disabled) {
  background-color: var(--bg-hover);
}

/* ✅ DISABLED - מטושטש */
.file-action-menu-item.disabled {
  opacity: 0.3;  /* 🌫️ מטושטש! */
  cursor: default;
  pointer-events: none;  /* ⚡ לא ניתן ללחיצה! */
}
```

---

## 🔁 זרימה מלאה: מהגדרה לרינדור

### תרחיש 1: לחיצה על Details בבחירה מרובה

```
┌─────────────────────────────────────────────────────────────┐
│ 1. משתמש בוחר 3 קבצים                                      │
│    → FileManager: selectedFiles = [file1, file2, file3]    │
│    → selectedCount = 3                                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. SelectionToolbar קורא:                                  │
│    getBulkMenuActions('MyDrive', selectedFiles)            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. evaluateBulkAction('details', files, 'MyDrive')         │
│    → selectedCount = 3                                      │
│    → evaluateAction(..., selectedCount=3)                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. ACTION_REGISTRY['details'].isEnabled(file, ctx, 3)      │
│    → return selectedCount <= 1                              │
│    → return 3 <= 1                                          │
│    → ❌ FALSE                                               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. ActionButton מקבל:                                      │
│    disabled={!action.enabled}  → disabled={true}           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. CSS אוטומטי:                                            │
│    .action-button.disabled {                                │
│      opacity: 0.3;           /* 🌫️ מטושטש */             │
│      pointer-events: none;   /* ⚡ לא ניתן ללחיצה */      │
│    }                                                         │
└─────────────────────────────────────────────────────────────┘
```

### תרחיש 2: לחיצה על Share ללא הרשאה

```
┌─────────────────────────────────────────────────────────────┐
│ 1. משתמש (Viewer) בוחר קובץ                                │
│    → file.permissionLevel = 'viewer'                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. FileRow קורא:                                            │
│    getAvailableActions('MyDrive', file, 1)                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. evaluateAction('share', file, 'MyDrive', 1)             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. ACTION_REGISTRY['share'].isEnabled(file, ctx)           │
│    → return file.permissionLevel === 'owner'                │
│    → return 'viewer' === 'owner'                            │
│    → ❌ FALSE                                               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. FileActionMenu מציג:                                     │
│    className="file-action-menu-item disabled"               │
│    disabled={true}                                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. CSS אוטומטי:                                            │
│    .file-action-menu-item.disabled {                        │
│      opacity: 0.3;         /* 🌫️ מטושטש */               │
│      pointer-events: none; /* ⚡ לא ניתן ללחיצה */        │
│    }                                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 מיפוי שלם: איפה כל רכיב משתמש

### רכיבים שמשתמשים במערכת המרכזית:

| רכיב | קוראת לפונקציה | מקבל enabled | מסתגל אוטומטית |
|------|----------------|--------------|----------------|
| **FileRow** (קובץ בשורה) | `getAvailableActions()` | ✅ `action.enabled` | ✅ ActionButton + FileActionMenu |
| **FileCard** (קובץ בכרטיס) | `getAvailableActions()` | ✅ `action.enabled` | ✅ ActionButton + FileActionMenu |
| **SelectionToolbar** (כלי בחירה) | `getToolbarActions()` + `getBulkMenuActions()` | ✅ `action.enabled` | ✅ ActionButton + FileActionMenu |
| **FileActionMenu** (תפריט More) | מקבל actions מהרכיב האב | ✅ `action.enabled` | ✅ CSS disabled class |

---

## ✅ ריכוז: האם המערכת מסונכרנת?

### שאלה 1: האם יש רכיב אחד שמנהל "האם ניתן לבצע פעולה"?
**✅ כן!** `ACTION_REGISTRY` + `evaluateAction()` + `evaluateBulkAction()`

### שאלה 2: האם כל תפריט/כפתור לוקח משם את המידע?
**✅ כן!** כל רכיב קורא ל:
- `getAvailableActions()` (קובץ יחיד)
- `getToolbarActions()` (בחירה מרובה)
- `getBulkMenuActions()` (בחירה מרובה)

### שאלה 3: האם הסטיילינג אוטומטי על פי enabled?
**✅ כן!** 
- `ActionButton`: מקבל `disabled={!action.enabled}` → CSS עושה opacity + pointer-events
- `FileActionMenu`: מקבל `disabled={!action.enabled}` → CSS עושה opacity + pointer-events

### שאלה 4: האם זה מסונכרן לגמרי?
**✅ כן!** 
- שינוי אחד ב-`ACTION_REGISTRY` משפיע על כל הכפתורים
- אין קוד כפול
- CSS גלובלי מטפל בכל הכפתורים

---

## 🐛 התיקון האחרון

**בעיה שהייתה:**
```javascript
// ❌ BEFORE: evaluateBulkAction לא העביר selectedCount
const baseEval = evaluateAction(actionId, firstFile, pageContext);
// תוצאה: Details היה enabled גם בבחירה מרובה!
```

**התיקון:**
```javascript
// ✅ AFTER: עוברים selectedCount
const selectedCount = files.length;
const baseEval = evaluateAction(actionId, firstFile, pageContext, selectedCount);
// תוצאה: Details מושבת בבחירה מרובה!
```

---

## 🎯 סיכום

```
ACTION_REGISTRY (fileUtils.js)
       ↓
evaluateAction() / evaluateBulkAction()
       ↓
getAvailableActions() / getToolbarActions() / getBulkMenuActions()
       ↓
ActionButton / FileActionMenu
       ↓
CSS אוטומטי (.disabled)
       ↓
UI מסונכרן ✅
```

**כל שינוי ב-ACTION_REGISTRY משפיע אוטומטית על כל המערכת!**
