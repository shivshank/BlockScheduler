var monthHeader = document.createElement("tr");
monthHeader.className = "calendar-dow";

var d, i, t = ("Sunday Monday Tuesday Wednesday " +
              "Thursday Friday Saturday").split(" ");

for (i = 0; i < 7; i+=1) {
    d = document.createElement("td");
    d.appendChild( document.createTextNode(t.splice(0, 1)[0]) );
    monthHeader.appendChild( d );
}

var createSection = function(className, section) {
    var d = createSlot(className, section.name);
    if (section.css) {
        $(d).css(section.css);
    }
    return d;
};

var createSlot = function(className, text, height) {
    var d = document.createElement("div"),
        t = document.createTextNode(text);
    d.className = className;
    d.appendChild(t);
    if (height !== null && height !== undefined) {
        $(d).css("height", height);
    }
    
    return d;
};

var createDay = function(parentRow, date, block, sections) {
    var height = 100 / sections.length + "%",
        td = $("<td>", {"class": "calendar-day"});
    
    td.append( createSlot("calendar-day-header",
                          date.getDate() + " " + params.blocks[block]));
    td.appendTo(parentRow);
    
    var p = 0,
        searchPeriod = function(i) {
            return i.period === p;
        },
        searchActive = function(i) {
            return i.on_days.indexOf(block) !== -1;
        },
        current;

    // for each period of the day
    for(p=0; p < params.periods; p+=1) {
        current = sections.filter(searchPeriod);
        if (current.length === 0) {
            // if there is nothing this period
            continue;
        }
        
        current = current.filter(searchActive);
        if (current.length === 0) {
            // if there is nothing this period and block/day
            td.append(createSlot("calendar-section off-day", ""));
        } else {
            td.append(createSection("calendar-section", current[0]));
        }
    }
};

var createWeek = function(parentTable, date, sections, skip_weekends) {
    var tr = document.createElement("tr"),
        month = date.getMonth(),
        day, block, s, e;
    
    parentTable.appendChild(tr);
    
    // changing date has side effects
    
    tr.className = "calendar-week";
    
    s = 0;
    e = 7;
    
    // for each day of the week
    for (day=s; day < e; day+=1, date.setDate(date.getDate() + 1)) {
        
        if (date.getMonth() === 3 && date.getDate() === 28) {
            date.toDateString();
        }
        
        if (skip_weekends && (day === 0 || day === 6)) {
            // the above placeholder clause will still advance the day of the
            // week
            if (day !== date.getDay()) {
                // special case at beginning of month: don't advance the date
                // till we reach the actual first day
                date.setDate(date.getDate() - 1);
            }
            continue;
        }
        
        if (day !== date.getDay() || date.getMonth() !== month) {
            // "day !== date's day" happens at start of month
            tr.appendChild( $("<td>",
                              {"class":"calendar-day placeholder"})[0] );
            // prevent increment
            date.setDate(date.getDate() - 1);
            //console.log(date.toDateString(), day, s, e);
            continue;
        }
        
        // else: advance the date if day of week and month line up: (see below)
        
        block = params.getBlockDay(date);
        if (params.isDay("no_session", date))  {
            createDay(tr, date, block, []);
            //tr.appendChild( $("<td>", {"class": "calendar-day no-session"})[0] );
        } else if (params.isSchoolDay(date)) {
            createDay(tr, date, block, sections);
        } else {
            tr.appendChild( $("<td>", {"class": "calendar-day no-school"})[0] );
        }
    }
};

var createMonth = function(parent, year, month, sections, skip_weekends) {
    // month is zero based
    var daysInMonth = new Date(year, month+1, 0).getDate(),
        container = $("<div>", {"class":"calendar-month"})[0],
        table = $("<table>", {"class": "calendar-table"})[0],
        header, months, dayText;
    
    parent.appendChild(container);
    
    months = ["January", "February", "March", "April", "May", "June",
              "July", "August", "September", "October", "November",
              "December"];
    
    header = document.createElement("h1");
    header.appendChild( document.createTextNode(months[month]) );
    container.appendChild(header);
    container.appendChild(table);
    
    header = $(monthHeader).clone();
    if (skip_weekends) {
        header.children().first().remove();
        header.children().last().remove();
    }
    table.appendChild(header[0]);
    
    var i = 0, 
        date = new Date(year, month, 1);
    
    // for each week in the month
    for (i=0; i < Math.ceil(daysInMonth/7); i+=1) {
        createWeek(table, date, sections, skip_weekends);
    }
};

var createCalendar = function(targetElement, sections, skip_weekends) {
    var i = new Date(params.start);
    i.setDate(1);
    
    // for each month as long as it begins before the end date
    while (i.getTime() < params.end.getTime()) {
        createMonth(targetElement, i.getFullYear(), i.getMonth(),
                    sections, skip_weekends);
        i.setMonth(i.getMonth() + 1);
    }
};
