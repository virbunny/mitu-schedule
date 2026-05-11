const STORAGE_KEY = "afterSchoolHomeworkList";
const MONTH_VIEW_STORAGE_KEY = "mituMonthViewCount";
const APP_NAME = "\u7c73\u5154\u6392\u8ab2\u8868";

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
const workdayNames = ["\u4e00", "\u4e8c", "\u4e09", "\u56db", "\u4e94"];

function getTodayValue() {
  return toDateValue(new Date());
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
  return `${date.getFullYear()} \u5e74 ${date.getMonth() + 1} \u6708`;
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

  return `${APP_NAME}\u5099\u4efd-${year}-${month}-${day}-${hour}${minute}${second}.json`;
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
    throw new Error("\u532f\u5165\u6a94\u6848\u683c\u5f0f\u4e0d\u6b63\u78ba\u3002");
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
    app: APP_NAME,
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

      if (!window.confirm(`\u8981\u532f\u5165 ${importedHomeworks.length} \u9805\u4f5c\u696d\u55ce\uff1f\u76ee\u524d\u8cc7\u6599\u6703\u88ab\u53d6\u4ee3\u3002`)) {
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
      window.alert("\u532f\u5165\u5b8c\u6210\u3002");
    } catch (error) {
      window.alert("\u532f\u5165\u5931\u6557\uff0c\u8acb\u78ba\u8a8d\u6a94\u6848\u662f\u7c73\u5154\u6392\u8ab2\u8868\u532f\u51fa\u7684 JSON \u5099\u4efd\u3002");
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
      // Opening the file directly may block offline registration.
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
    button.setAttribute("aria-label", `\u9078\u64c7 ${formatDate(dateValue)}`);

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
        moreItem.textContent = `\u9084\u6709 ${hiddenTotal} \u9805`;
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
    monthTitle.textContent = `${formatMonth(visibleMonth)} \u5230 ${formatMonth(nextMonth)}`;
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
  homeworkCount.textContent = `${selectedHomeworks.length} \u9805`;
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
    completeButton.textContent = homework.done ? "\u6539\u56de\u672a\u5b8c\u6210" : "\u5b8c\u6210";
    completeButton.addEventListener("click", () => toggleHomework(homework.id));

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "edit-button";
    editButton.textContent = "\u7de8\u8f2f";
    editButton.addEventListener("click", () => editHomework(homework.id));

    const exchangeButton = document.createElement("button");
    exchangeButton.type = "button";
    exchangeButton.className = "exchange-button";
    exchangeButton.textContent = "\u4ea4\u63db";
    exchangeButton.addEventListener("click", () => exchangeHomeworkDate(homework.id));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-button";
    deleteButton.textContent = "\u522a\u9664";
    deleteButton.addEventListener("click", () => deleteHomework(homework.id));

    content.append(date, text);
    actions.append(completeButton, editButton, exchangeButton, deleteButton);
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

  printTitle.textContent = `${APP_NAME} v1.0.1`;
  printWeekRange.textContent = `${printYear} \u5e74 ${printMonth} \u6708`;
  printWeek.innerHTML = "";

  workdayNames.forEach((name) => {
    const header = document.createElement("div");
    header.className = "print-weekday-header";
    header.textContent = `\u661f\u671f${name}`;
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
      countText.textContent = dayHomeworks.length > 0 ? `${dayHomeworks.length} \u9805` : " ";

      title.append(dateText, countText);
    }

    if (dayHomeworks.length > 0) {
      dayHomeworks.forEach((homework) => {
        const taskItem = document.createElement("li");
        taskItem.className = homework.done ? "is-done" : "";
        taskItem.textContent = homework.done ? `${homework.text}\uff08\u5b8c\u6210\uff09` : homework.text;
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

function editHomework(id) {
  const homework = homeworks.find((item) => item.id === id);

  if (!homework) {
    return;
  }

  const nextText = window.prompt("\u8acb\u4fee\u6539\u4f5c\u696d\u5167\u5bb9", homework.text);

  if (nextText === null) {
    return;
  }

  const trimmedText = nextText.trim();

  if (!trimmedText) {
    window.alert("\u4f5c\u696d\u5167\u5bb9\u4e0d\u80fd\u662f\u7a7a\u767d\u3002");
    return;
  }

  homeworks = homeworks.map((item) => (
    item.id === id ? { ...item, text: trimmedText } : item
  ));

  saveHomeworks();
  renderAll();
}

function exchangeHomeworkDate(id) {
  const homework = homeworks.find((item) => item.id === id);

  if (!homework) {
    return;
  }

  const nextDate = window.prompt("\u8acb\u8f38\u5165\u8981\u4ea4\u63db\u5230\u7684\u65e5\u671f\uff08\u683c\u5f0f\uff1aYYYY-MM-DD\uff09", homework.date);

  if (nextDate === null) {
    return;
  }

  const trimmedDate = nextDate.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
    window.alert("\u65e5\u671f\u683c\u5f0f\u4e0d\u6b63\u78ba\uff0c\u8acb\u4f7f\u7528 YYYY-MM-DD\u3002");
    return;
  }

  homeworks = homeworks.map((item) => (
    item.id === id ? { ...item, date: trimmedDate } : item
  ));

  saveHomeworks();
  setSelectedDate(trimmedDate);
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
todayText.textContent = `\u4eca\u5929\uff1a${formatDate(getTodayValue())}`;
renderAll();
registerServiceWorker();
