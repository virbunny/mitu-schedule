const STORAGE_KEY = "afterSchoolHomeworkList";
const MONTH_VIEW_STORAGE_KEY = "mituMonthViewCount";

const form = document.getElementById("homeworkForm");
const homeworkInput = document.getElementById("homeworkInput");
const dateInput = document.getElementById("dateInput");
const homeworkList = document.getElementById("homeworkList");
const emptyState = document.getElementById("emptyState");
const homeworkCount = document.getElementById("homeworkCount");
const todayText = document.getElementById("todayText");
const selectedDateText = document.getElementById("selectedDateText");
const calendarGrid = document.getElementById("calendarGrid");
const monthTitle = document.getElementById("monthTitle");
const monthViewOneButton = document.getElementById("monthViewOneButton");
const monthViewTwoButton = document.getElementById("monthViewTwoButton");
const prevMonthButton = document.getElementById("prevMonthButton");
const nextMonthButton = document.getElementById("nextMonthButton");
const printWeekButton = document.getElementById("printWeekButton");
const exportButton = document.getElementById("exportButton");
const importFile = document.getElementById("importFile");
const printTitle = document.getElementById("printTitle");
const printWeekRange = document.getElementById("printWeekRange");
const printWeek = document.getElementById("printWeek");

let homeworks = loadHomeworks();
let selectedDate = getTodayValue();
let visibleMonth = new Date(`${selectedDate}T00:00:00`);
let monthViewCount = loadMonthViewCount();
const workdayNames = ["一", "二", "三", "四", "五"];

function getTodayValue() {
  const today = new Date();
  return toDateValue(today);
}

function toDateValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(dateValue) {
  const [year, month, day] = dateValue.split("-");
  return `${year}/${month}/${day}`;
}

function formatPrintDate(dateValue) {
  const [, month, day] = dateValue.split("-");
  return `${Number(month)}/${Number(day)}`;
}

function formatMonth(date) {
  return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月`;
}

function loadMonthViewCount() {
  return localStorage.getItem(MONTH_VIEW_STORAGE_KEY) === "2" ? 2 : 1;
}

function saveMonthViewCount() {
  localStorage.setItem(MONTH_VIEW_STORAGE_KEY, String(monthViewCount));
}

function loadHomeworks() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    return [];
  }

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function saveHomeworks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(homeworks));
}

function getBackupFileName() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");
  const second = String(now.getSeconds()).padStart(2, "0");

  return `米兔排課表備份-${year}-${month}-${day}-${hour}${minute}${second}.json`;
}

function isValidHomework(homework) {
  return homework
    && typeof homework.id === "string"
    && typeof homework.text === "string"
    && homework.text.length > 0
    && typeof homework.date === "string"
    && /^\d{4}-\d{2}-\d{2}$/.test(homework.date)
    && typeof homework.done === "boolean";
}

function normalizeImportedHomeworks(data) {
  const importedHomeworks = Array.isArray(data) ? data : data.homeworks;

  if (!Array.isArray(importedHomeworks)) {
    throw new Error("匯入檔案格式不正確。");
  }

  return importedHomeworks.map((homework) => ({
    id: typeof homework.id === "string" ? homework.id : createId(),
    text: String(homework.text || "").trim(),
    date: String(homework.date || ""),
    done: Boolean(homework.done)
  })).filter(isValidHomework);
}

function exportHomeworks() {
  const backup = {
    app: "米兔排課表",
    version: 1,
    exportedAt: new Date().toISOString(),
    homeworks
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const link = document.createElement("a");

  link.href = URL.createObjectURL(blob);
  link.download = getBackupFileName();
  link.click();
  URL.revokeObjectURL(link.href);
}

function importHomeworks(file) {
  const reader = new FileReader();

  reader.addEventListener("load", () => {
    try {
      const data = JSON.parse(reader.result);
      const importedHomeworks = normalizeImportedHomeworks(data);

      if (!window.confirm(`確定匯入 ${importedHomeworks.length} 筆資料？目前資料會被覆蓋。`)) {
        return;
      }

      homeworks = importedHomeworks;
      saveHomeworks();
      if (homeworks.length > 0) {
        selectedDate = homeworks[0].date;
        visibleMonth = new Date(`${selectedDate}T00:00:00`);
        dateInput.value = selectedDate;
      }
      renderAll();
      window.alert("匯入完成。");
    } catch (error) {
      window.alert("匯入失敗，請確認檔案是米兔排課表匯出的 JSON。");
    } finally {
      importFile.value = "";
    }
  });

  reader.readAsText(file, "UTF-8");
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").then((registration) => {
      registration.update();
    }).catch(() => {
      // 直接用檔案開啟時無法啟用 PWA，網站功能仍可正常使用。
    });
  });
}

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getHomeworksByDate(dateValue) {
  return homeworks
    .filter((homework) => homework.date === dateValue)
    .sort((a, b) => Number(a.done) - Number(b.done));
}

function countHomeworksByDate(dateValue) {
  return homeworks.filter((homework) => homework.date === dateValue).length;
}

function getCalendarPreviewByDate(dateValue) {
  return getHomeworksByDate(dateValue).slice(0, 2);
}

function getWeekDates(dateValue) {
  const date = new Date(`${dateValue}T00:00:00`);
  const firstDate = new Date(date);
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  firstDate.setDate(date.getDate() + mondayOffset);

  return Array.from({ length: 5 }, (_, index) => {
    const weekDate = new Date(firstDate);
    weekDate.setDate(firstDate.getDate() + index);
    return toDateValue(weekDate);
  });
}

function getPrintMonthDates(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const dates = [];
  let firstWorkday = null;

  for (let day = 1; day <= lastDay; day += 1) {
    const monthDate = new Date(year, month, day);
    const weekday = monthDate.getDay();

    if (weekday >= 1 && weekday <= 5) {
      firstWorkday = monthDate;
      break;
    }
  }

  if (firstWorkday) {
    const leadingBlankCount = firstWorkday.getDay() - 1;

    for (let index = 0; index < leadingBlankCount; index += 1) {
      dates.push("");
    }
  }

  for (let day = 1; day <= lastDay; day += 1) {
    const monthDate = new Date(year, month, day);
    const weekday = monthDate.getDay();

    if (weekday >= 1 && weekday <= 5) {
      dates.push(toDateValue(monthDate));
    }
  }

  while (dates.length % 5 !== 0) {
    dates.push("");
  }

  return dates;
}

function getMonthStart(dateValue) {
  const date = new Date(`${dateValue}T00:00:00`);
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function isDateInVisibleMonths(dateValue) {
  const selectedMonthStart = getMonthStart(dateValue);
  const visibleStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const visibleEnd = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + monthViewCount, 1);

  return selectedMonthStart >= visibleStart && selectedMonthStart < visibleEnd;
}

function setVisibleMonthToDate(dateValue) {
  visibleMonth = getMonthStart(dateValue);
}

function setSelectedDate(dateValue, shouldFocusInput = false) {
  selectedDate = dateValue;
  dateInput.value = selectedDate;
  if (!isDateInVisibleMonths(selectedDate)) {
    setVisibleMonthToDate(selectedDate);
  }
  renderAll();

  if (shouldFocusInput) {
    homeworkInput.focus();
  }
}

function updateMonthViewButtons() {
  monthViewOneButton.classList.toggle("is-active", monthViewCount === 1);
  monthViewTwoButton.classList.toggle("is-active", monthViewCount === 2);
  monthViewOneButton.setAttribute("aria-pressed", String(monthViewCount === 1));
  monthViewTwoButton.setAttribute("aria-pressed", String(monthViewCount === 2));
}

function renderCalendarMonth(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const todayValue = getTodayValue();
  const firstDay = new Date(year, month, 1);
  const startDate = new Date(firstDay);
  const firstDayOfWeek = firstDay.getDay();
  const mondayOffset = firstDayOfWeek === 0 ? -6 : 1 - firstDayOfWeek;
  const monthBox = document.createElement("section");
  const monthName = document.createElement("h3");
  const weekdays = document.createElement("div");
  const daysGrid = document.createElement("div");

  startDate.setDate(firstDay.getDate() + mondayOffset);
  monthBox.className = "calendar-month";
  monthName.className = "calendar-month-name";
  monthName.textContent = formatMonth(monthDate);
  weekdays.className = "weekdays";
  weekdays.setAttribute("aria-hidden", "true");
  daysGrid.className = "calendar-days";

  workdayNames.forEach((name) => {
    const weekday = document.createElement("span");
    weekday.textContent = name;
    weekdays.appendChild(weekday);
  });

  for (let index = 0; index < 30; index += 1) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index + Math.floor(index / 5) * 2);

    const dateValue = toDateValue(date);
    const previewHomeworks = getCalendarPreviewByDate(dateValue);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "calendar-day";
    button.setAttribute("aria-label", `選擇 ${formatDate(dateValue)}`);

    if (date.getMonth() !== month) {
      button.classList.add("outside-month");
    }

    if (dateValue === todayValue) {
      button.classList.add("is-today");
    }

    if (dateValue === selectedDate) {
      button.classList.add("is-selected");
    }

    const dayNumber = document.createElement("span");
    dayNumber.className = "day-number";
    dayNumber.textContent = date.getDate();
    button.appendChild(dayNumber);

    if (previewHomeworks.length > 0) {
      const previewList = document.createElement("span");
      previewList.className = "day-preview-list";

      previewHomeworks.forEach((homework) => {
        const previewItem = document.createElement("span");
        previewItem.className = homework.done ? "day-preview done-preview" : "day-preview";
        previewItem.textContent = homework.text;
        previewList.appendChild(previewItem);
      });

      const hiddenTotal = countHomeworksByDate(dateValue) - previewHomeworks.length;

      if (hiddenTotal > 0) {
        const moreItem = document.createElement("span");
        moreItem.className = "day-more";
        moreItem.textContent = `還有 ${hiddenTotal} 筆`;
        previewList.appendChild(moreItem);
      }

      button.appendChild(previewList);
    }

    button.addEventListener("click", () => setSelectedDate(dateValue, true));
    daysGrid.appendChild(button);
  }

  monthBox.append(monthName, weekdays, daysGrid);
  return monthBox;
}

function renderCalendar() {
  calendarGrid.innerHTML = "";
  calendarGrid.className = monthViewCount === 2 ? "calendar-grid two-months" : "calendar-grid";
  updateMonthViewButtons();

  if (monthViewCount === 1) {
    monthTitle.textContent = formatMonth(visibleMonth);
  } else {
    const nextMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1);
    monthTitle.textContent = `${formatMonth(visibleMonth)} ～ ${formatMonth(nextMonth)}`;
  }

  for (let index = 0; index < monthViewCount; index += 1) {
    const monthDate = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + index, 1);
    calendarGrid.appendChild(renderCalendarMonth(monthDate));
  }
}

function renderHomeworks() {
  const selectedHomeworks = getHomeworksByDate(selectedDate);

  homeworkList.innerHTML = "";
  emptyState.hidden = selectedHomeworks.length > 0;
  homeworkCount.textContent = `${selectedHomeworks.length} 筆`;
  selectedDateText.textContent = formatDate(selectedDate);

  selectedHomeworks.forEach((homework) => {
    const item = document.createElement("li");
    item.className = homework.done ? "homework-item done" : "homework-item";

    const content = document.createElement("div");
    content.className = "homework-content";

    const date = document.createElement("span");
    date.className = "homework-date";
    date.textContent = formatDate(homework.date);

    const text = document.createElement("p");
    text.className = "homework-text";
    text.textContent = homework.text;

    const actions = document.createElement("div");
    actions.className = "actions";

    const completeButton = document.createElement("button");
    completeButton.type = "button";
    completeButton.className = "complete-button";
    completeButton.textContent = homework.done ? "改為未完成" : "完成";
    completeButton.addEventListener("click", () => toggleHomework(homework.id));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-button";
    deleteButton.textContent = "刪除";
    deleteButton.addEventListener("click", () => deleteHomework(homework.id));

    content.append(date, text);
    actions.append(completeButton, deleteButton);
    item.append(content, actions);
    homeworkList.appendChild(item);
  });
}

function renderAll() {
  renderCalendar();
  renderHomeworks();
  renderPrintSchedule();
}

function renderPrintSchedule() {
  const monthDates = getPrintMonthDates(visibleMonth);
  const printYear = visibleMonth.getFullYear();
  const printMonth = visibleMonth.getMonth() + 1;

  printTitle.textContent = "米兔排課表 v1.0.1";
  printWeekRange.textContent = `${printYear} 年 ${printMonth} 月`;
  printWeek.innerHTML = "";

  workdayNames.forEach((name) => {
    const header = document.createElement("div");
    header.className = "print-weekday-header";
    header.textContent = `星期${name}`;
    printWeek.appendChild(header);
  });

  monthDates.forEach((dateValue) => {
    const dayBox = document.createElement("div");
    dayBox.className = dateValue ? "print-day" : "print-day print-day-blank";

    const title = document.createElement("h3");
    title.className = "print-day-title";

    const taskList = document.createElement("ul");
    taskList.className = "print-task-list";

    const dayHomeworks = dateValue ? getHomeworksByDate(dateValue) : [];

    if (dateValue) {
      const dateText = document.createElement("span");
      dateText.className = "print-date";
      dateText.textContent = formatPrintDate(dateValue);

      const countText = document.createElement("span");
      countText.className = "print-task-count";
      countText.textContent = dayHomeworks.length > 0 ? `${dayHomeworks.length} 項` : " ";

      title.append(dateText, countText);
    }

    if (dayHomeworks.length > 0) {
      dayHomeworks.forEach((homework) => {
        const taskItem = document.createElement("li");
        taskItem.className = homework.done ? "is-done" : "";
        taskItem.textContent = homework.done ? `${homework.text}（完成）` : homework.text;
        taskList.appendChild(taskItem);
      });
    }

    const noteLines = document.createElement("div");
    noteLines.className = "print-note-lines";

    for (let lineIndex = 0; lineIndex < 2; lineIndex += 1) {
      const noteLine = document.createElement("span");
      noteLines.appendChild(noteLine);
    }

    dayBox.append(title, taskList, noteLines);
    printWeek.appendChild(dayBox);
  });
}

function addHomework(text, date) {
  homeworks.push({
    id: createId(),
    text,
    date,
    done: false
  });

  saveHomeworks();
  selectedDate = date;
  if (!isDateInVisibleMonths(date)) {
    setVisibleMonthToDate(date);
  }
  renderAll();
}

function setMonthViewCount(nextCount) {
  monthViewCount = nextCount;
  saveMonthViewCount();
  renderCalendar();
}

function toggleHomework(id) {
  homeworks = homeworks.map((homework) => {
    if (homework.id !== id) {
      return homework;
    }

    return {
      ...homework,
      done: !homework.done
    };
  });

  saveHomeworks();
  renderAll();
}

function deleteHomework(id) {
  homeworks = homeworks.filter((homework) => homework.id !== id);
  saveHomeworks();
  renderAll();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const text = homeworkInput.value.trim();
  const date = dateInput.value;

  if (!text || !date) {
    return;
  }

  addHomework(text, date);
  form.reset();
  dateInput.value = selectedDate;
  homeworkInput.focus();
});

dateInput.addEventListener("change", () => {
  if (dateInput.value) {
    setSelectedDate(dateInput.value);
  }
});

prevMonthButton.addEventListener("click", () => {
  visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1);
  renderCalendar();
});

nextMonthButton.addEventListener("click", () => {
  visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1);
  renderCalendar();
});

monthViewOneButton.addEventListener("click", () => setMonthViewCount(1));

monthViewTwoButton.addEventListener("click", () => setMonthViewCount(2));

printWeekButton.addEventListener("click", () => {
  renderPrintSchedule();
  window.print();
});

exportButton.addEventListener("click", exportHomeworks);

importFile.addEventListener("change", () => {
  const file = importFile.files[0];

  if (file) {
    importHomeworks(file);
  }
});

dateInput.value = selectedDate;
todayText.textContent = `今天：${formatDate(getTodayValue())}`;
renderAll();
registerServiceWorker();
