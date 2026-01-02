// -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Global Variables
// -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

let intervalID = null;                              // Interval ID for clock update
let blinkIntervalID = null;                         // Interval ID for digit blinking
let alarmEffektIntervalID = null;                   // Interval ID for alarm effect (PM-dot blinking)
let deleteBlinkIntervalID = null;                   // Interval ID for deleting confirmation blinking
let deleteBlinkTimeoutID = null;                    // Timeout ID for delete confirmation

let isRunning = false;                              // State if the clock is running
let isRunningWithSeconds = JSON.parse(localStorage.getItem('isRunningWithSeconds') ?? 'false');  // Retrieve seconds display state from localStorage
let is24hFormat = JSON.parse(localStorage.getItem('is24hFormat') ?? 'true');  // Retrieve 24h format state from localStorage

let alarmEnabled = false;                           // Is alarm enabled
let alarmTriggered = false;                         // Has alarm been triggered
let alarmMode = false;                              // Is alarm input mode active
let alarmDeleteConfirm = false;                     // Is delete confirmation active
let isDeletingAlarm = false;                        // State for deleting alarm

let alarmTime = { hour: 0, minute: 0 };             // Stores alarm time
let alarmIsPM = false;                              // AM/PM state for 12h mode

let alarmInputIndex = 0;                            // Current digit input index for alarm
let alarmDigits = ['hour-one', 'hour-two', 'minute-one', 'minute-two'];  // Alarm digit element IDs

let gBlinkState = false;                            // Blink state for segments

const storedAlarmEnabled = JSON.parse(localStorage.getItem('alarmEnabled') ?? 'false');  // Stored alarm enabled state
const storedAlarmTime = JSON.parse(localStorage.getItem('alarmTime') ?? 'null');  // Stored alarm time

// -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Digit segment definitions
// -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

const segments = {                                  // 7-segment definitions for numbers 0-9
    0: ['a', 'b', 'c', 'd', 'e', 'f'],
    1: ['b', 'c'],
    2: ['a', 'b', 'g', 'e', 'd'],
    3: ['a', 'b', 'g', 'c', 'd'],
    4: ['f', 'g', 'b', 'c'],
    5: ['a', 'f', 'g', 'c', 'd'],
    6: ['a', 'f', 'e', 'd', 'c', 'g'],
    7: ['a', 'b', 'c'],
    8: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
    9: ['a', 'b', 'c', 'd', 'f', 'g']
};

const digits = {                                    // Map DOM elements for each digit
    'hour-one': $('#hour-one'),
    'hour-two': $('#hour-two'),
    'minute-one': $('#minute-one'),
    'minute-two': $('#minute-two'),
    'second-one': $('#second-one'),
    'second-two': $('#second-two')
};

// -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Functions: Digit rendering
// -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

// Set a digit to display a number
function setDigit(digitEl, num) {
    digitEl.find('.segment').removeClass('on');                         // Clear all segments
    segments[num].forEach(s => digitEl.find(`.${s}`).addClass('on'));   // Activate relevant segments
}

// Clear all segments and dots
function clearSegments() {
    Object.values(digits).forEach(digit => digit.find('.segment').removeClass('on'));
    $('.dot, #pm-dot').removeClass('on');
}

// Stop all blinking intervals
function stopAllBlinking() {
    if (blinkIntervalID) { clearInterval(blinkIntervalID); blinkIntervalID = null; }
    if (deleteBlinkIntervalID) { clearInterval(deleteBlinkIntervalID); deleteBlinkIntervalID = null; }
    if (alarmEffektIntervalID) { clearInterval(alarmEffektIntervalID); alarmEffektIntervalID = null; }
    gBlinkState = false;
}

// Render current time (hours & minutes)
function renderTime() {
    let hours = new Date().getHours();
    let minutes = new Date().getMinutes();

    if (!is24hFormat) {                             // Convert to 12h format if needed
        $('#pm-dot').toggleClass('on', hours >= 12);
        hours = hours % 12 || 12;
    } else {
        $('#pm-dot').removeClass('on');
    }

    setDigit(digits['hour-one'], Math.floor(hours / 10));
    setDigit(digits['hour-two'], hours % 10);

    setDigit(digits['minute-one'], Math.floor(minutes / 10));
    setDigit(digits['minute-two'], minutes % 10);
}

// Render time including seconds
function renderTimeWithSeconds() {
    renderTime();
    let seconds = new Date().getSeconds();

    setDigit(digits['second-one'], Math.floor(seconds / 10));
    setDigit(digits['second-two'], seconds % 10);
}

// -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Functions: Clock controls
// -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

// Start clock with hours, first seperator and minutes
function start() {
    if (intervalID) clearInterval(intervalID);
    isRunning = true;

    clearSegments();
    renderTime();

    intervalID = setInterval(function() {
        renderTime();
        checkAlarm();
        $('#seperator-1 .dot-top, #seperator-1 .dot-bottom').toggleClass('on');
    }, 1000);
}

// Start clock with hours, first seperator, minutes, second seperator and seconds
function startWithSeconds() {
    if (intervalID) clearInterval(intervalID);

    isRunning = true;
    isRunningWithSeconds = true;
    localStorage.setItem('isRunningWithSeconds', JSON.stringify(isRunningWithSeconds));

    clearSegments();
    renderTimeWithSeconds();

    intervalID = setInterval(function() {
        renderTimeWithSeconds();
        checkAlarm();
        $('#seperator-1 .dot-top, #seperator-1 .dot-bottom').toggleClass('on');
        $('#seperator-2 .dot-top, #seperator-2 .dot-bottom').toggleClass('on');
    }, 1000);
}

// Pause the clock
function pause() {
    if (!isRunning) return;
    isRunning = false;

    clearInterval(intervalID);
    intervalID = null;
    clearSegments();
}

// -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Functions: PM-dot, 12h/24h converion, blinking, helpers
// -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

// Toggles the blinking effect when switching to 12h format
function toggle12hFormatEffect() {
    let blinkCount = 0;
    const totalBlinks = 4;

    alarmEffektIntervalID = setInterval(() => {
        $('#pm-dot').toggleClass('on');
        blinkCount++;
        if (blinkCount >= totalBlinks) {
            clearInterval(alarmEffektIntervalID);

            if (new Date().getHours() >= 12) {  // Activates PM-dot when necessary
                $('#pm-dot').addClass('on');
            } else {
                $('#pm-dot').removeClass('on');
            }
        }
    }, 250);
}

// Toggles all G-Segments for blinking effect
function setAllGSegments(state) {
    Object.values(digits).forEach(digit => {
        digit.find('.g').toggleClass('on', state);
    });
}

// Updates the PM-dot for alarm input in 12h format
function updatePMDot() {
    if (alarmIsPM) {
        $('#pm-dot').addClass('on');
    } else {
        $('#pm-dot').removeClass('on');
    }
}

// Converts the alarm time to 24h Format for 12h Format
function convertAlarmTo24h() {
    if (is24hFormat) return;

    let hour = alarmTime.hour;

    if (hour === 12) {
        alarmTime.hour = alarmIsPM ? 12 : 0;
    } else {
        alarmTime.hour = alarmIsPM ? hour + 12 : hour;
    }
}

function blinkNextDigit() {
    stopAllBlinking();

    const digitID = alarmDigits[alarmInputIndex];
    const digit = digits[digitID];

    digit.find('.segment').removeClass('on');

    let visible = false;

    blinkIntervalID = setInterval(() => {
        visible = !visible;
        digit.find('.segment').toggleClass('on', visible);
    }, 500);
}

// -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Functions: Alarm
// -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

// Checks if alarm time equals real time
function checkAlarm() {
    if (!alarmEnabled || !alarmTime || alarmTriggered) return;
    const now = new Date();

    if (
        now.getHours() === alarmTime.hour &&
        now.getMinutes() === alarmTime.minute &&
        now.getSeconds() === 0 &&
        !alarmTriggered
    ) triggerAlarm();
}

// Triggers alarm
function triggerAlarm() {
    alarmTriggered = true;

    $('#pm-dot').removeClass('on');
    alarmEffektIntervalID = setInterval(function() {
        $('#pm-dot').toggleClass('on');
    }, 500);

    setTimeout(function() {
        clearInterval(alarmEffektIntervalID);
        alarmEnabled = false;
        $('#pm-dot').removeClass('on');
        alarmTime = { hour: 0, minute: 0 };
    }, 10000);
}

// Disables Alarm
function disableAlarm() {
    alarmEnabled = false;
    alarmTriggered = false;
    alarmTime = { hour: 0, minute: 0 };

    localStorage.removeItem('alarmEnabled');
    localStorage.removeItem('alarmTime');

    clearInterval(alarmEffektIntervalID);
    $('#pm-dot').removeClass('on');
}

// -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Functions: Alarm input
// -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

// Starts input of alarm
function startAlarmInput() {
    stopAllBlinking();
    pause();

    alarmIsPM = false;
    updatePMDot();

    alarmInputIndex = 0;
    alarmMode = true;

    blinkNextDigit();

    $(document)
        .off('keydown.alarmInput')
        .on('keydown.alarmInput', handleAlarmKeyInput);
}

// Handles Alarm input and Backspace
function handleAlarmKeyInput(e) {
    if (!alarmMode) return;
    const key = e.key;

    if (key === 'Backspace') {
        if (alarmInputIndex > 0) {
            clearInterval(blinkIntervalID);

            alarmInputIndex--;

            const digitID = alarmDigits[alarmInputIndex];
            digits[digitID].find('.segment').removeClass('on');

            for (let i = alarmInputIndex + 1; i < alarmDigits.length; i++) {
                digits[alarmDigits[i]].find('.segment').removeClass('on');
            }

            blinkNextDigit();
        }
        return;
    }

    if (key < '0' || key > '9') return;
    applyAlarmDigit(parseInt(key));
}

// Checks Alarm Input for invalid numbers
function applyAlarmDigit(number) {
    const digitID = alarmDigits[alarmInputIndex];

    if (is24hFormat) {
        if (alarmInputIndex === 0 && number > 2) return;

        if (alarmInputIndex === 1) {
            const hourTens = Math.floor(alarmTime.hour / 10);
            if (hourTens === 2 && number > 3) return;
        }

        if (alarmInputIndex === 2 && number > 5) return;
    }

    else {
        if (alarmInputIndex === 0 && number > 1) return;

        if (alarmInputIndex === 1) {
            const tempHour = Math.floor(alarmTime.hour / 10) * 10 + number;
            if (tempHour > 12) return;
        }

        if (alarmInputIndex === 2 && number > 5) return;
    }

    setDigit(digits[digitID], number);

    if (alarmInputIndex === 0) alarmTime.hour = number * 10;
    else if (alarmInputIndex === 1) alarmTime.hour = Math.floor(alarmTime.hour / 10) * 10 + number;
    else if (alarmInputIndex === 2) alarmTime.minute = number * 10;
    else if (alarmInputIndex === 3) alarmTime.minute = Math.floor(alarmTime.minute / 10) * 10 + number;

    alarmInputIndex++;

    if (alarmInputIndex === alarmDigits.length) {
        clearInterval(blinkIntervalID);
        blinkIntervalID = null;

        convertAlarmTo24h();

        updatePMDot();
        finishAlarmInput();
        return;
    }

    blinkNextDigit();
}

// Finishes Alarm Input
function finishAlarmInput() {
    clearInterval(blinkIntervalID);
    blinkIntervalID = null;

    alarmMode = false;
    alarmInputIndex = 0;

    $(document).off('keydown.alarmInput');
                
    alarmEnabled = true;
    alarmTriggered = false;

    localStorage.setItem('alarmEnabled', JSON.stringify(alarmEnabled));
    localStorage.setItem('alarmTime', JSON.stringify(alarmTime));

    console.log('Alarmzeit gesetzt: ', alarmTime);

    setTimeout(() => $('#start-pause-btn').click(), 1000);
}

// -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Functions: Deleting alarm
// -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

// Starts confirm blinking
function startDeleteConfirmBlink() {
    stopAllBlinking();

    console.log('Alarm löschen? Nochmal drücken zum Bestätigen.');

    alarmDeleteConfirm = true;
    isDeletingAlarm = true;

    clearInterval(intervalID);
    intervalID = null;

    clearSegments();

    clearInterval(deleteBlinkIntervalID);
    gBlinkState = false;

    deleteBlinkIntervalID = setInterval(() => {
        gBlinkState = !gBlinkState;
        setAllGSegments(gBlinkState);
    }, 500);

    if (alarmMode) {
        stopAllBlinking();
        setAllGSegments(false);
        clearSegments();
    }

    deleteBlinkTimeoutID = setTimeout(() => {
        clearInterval(deleteBlinkIntervalID);
        deleteBlinkIntervalID = null;
        gBlinkState = false;
        setAllGSegments(gBlinkState);
        alarmDeleteConfirm = false;
        isDeletingAlarm = false;

        if (!alarmMode && isRunning) {
            setAllGSegments(false);

            if (isRunningWithSeconds) {
                startWithSeconds();
            } else {
                start();
            }
        }
        deleteBlinkTimeoutID = null;
    }, 7000)
}

// Starts fast blinking and alarm clearing process
function fastBlinkAndClearAlarm() {
    clearInterval(deleteBlinkIntervalID);

    let count = 0;
    gBlinkState = false;

    deleteBlinkIntervalID = setInterval(() => {
        gBlinkState = !gBlinkState;
        setAllGSegments(gBlinkState);
        count++;

        if (count >= 8) {
            clearInterval(deleteBlinkIntervalID);
            gBlinkState = false;
            setAllGSegments(gBlinkState);

            disableAlarm();
            console.log('Alarm gelöscht!');
            alarmDeleteConfirm = false;

            if (isRunningWithSeconds) {
                startWithSeconds();
            } else {
                start();
            }
        }
    }, 120);

    disableAlarm();
    alarmDeleteConfirm = false;
    alarmTime = { hour: 0, minute: 0 };
}

// -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Function: Alarm button handler
// -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

// Handles behaviour when alarm button is clicked
function onAlarmButtonClick() {
    if (alarmMode) {
        stopAllBlinking();

        clearInterval(blinkIntervalID);
        blinkIntervalID = null;
        alarmMode = false;
        alarmInputIndex = 0;

        $(document).off('keydown.alarmInput');
        clearSegments();
        $('#start-pause-btn').click();

        console.log('Alarm-Eingabe abgebrochen.');
        return;
    }
    
    if (!isRunning) return;

    if (alarmEnabled && !alarmTriggered) {
        if (!alarmDeleteConfirm) {
            startDeleteConfirmBlink();
        } else {
            fastBlinkAndClearAlarm();
        }
        return;
    };

    if (alarmEnabled && alarmTriggered) {
        disableAlarm();
        alarmDeleteConfirm = false;
        return;
    }

    startAlarmInput();
}

// -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Event Listener
// -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

// Start-Pause Button
$('#start-pause-btn').click(function() {
    if (isRunning || alarmMode) {
        pause();

        clearInterval(blinkIntervalID);
        blinkIntervalID = null;
        clearInterval(deleteBlinkIntervalID);
        deleteBlinkIntervalID = null;

        if (deleteBlinkTimeoutID) {
            clearTimeout(deleteBlinkTimeoutID);
            deleteBlinkTimeoutID = null;
        }

        gBlinkState = false;
        setAllGSegments(gBlinkState);
        isDeletingAlarm = false;
        alarmDeleteConfirm = false;

        if (alarmMode) {
            stopAllBlinking();
            alarmMode = false;
            $(document).off('keydown.alarmInput');
            clearSegments();
        }
    } else {
        if (isRunningWithSeconds) {
            startWithSeconds();
        } else {
            start();
        }
    }
});

// Toggle Seconds Button
$('#toggle-seconds-btn').click(function() {
    if (!isRunning) return;
    if (isRunningWithSeconds) {
        isRunningWithSeconds = false;
        localStorage.setItem('isRunningWithSeconds', JSON.stringify(isRunningWithSeconds));
        pause();
        start();
    } else {
        isRunningWithSeconds = true;
        localStorage.setItem('isRunningWithSeconds', JSON.stringify(isRunningWithSeconds));
        pause();
        startWithSeconds();
    }
});

// Toggle Time Format Button
$('#toggle-time-format-btn').click(function() {
    clearInterval(alarmEffektIntervalID);
    alarmEffektIntervalID = null;

    if (alarmMode) {
        alarmIsPM = !alarmIsPM;
        updatePMDot();
        return;
    }

    if (!isRunning) return;

    is24hFormat = !is24hFormat;
    localStorage.setItem('is24hFormat', JSON.stringify(is24hFormat));

    if (!is24hFormat) {
        toggle12hFormatEffect();
    } else {
        $('#pm-dot').removeClass('on');
    }

    if (isRunningWithSeconds) {
        renderTimeWithSeconds();
    } else {
        renderTime();
    }
});

// Alarm Button
$('#alarm-btn').click(onAlarmButtonClick);

// -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Init processes
// -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

if (storedAlarmEnabled && storedAlarmTime) {
    alarmEnabled = true;
    alarmTriggered = false;
    alarmTime = storedAlarmTime;
}

renderTime();

if (isRunningWithSeconds) {
    startWithSeconds();
} else {
    start();
}