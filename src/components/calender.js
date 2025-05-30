import React, { Component } from 'react';
import './calendar.css';
import axios from 'axios';

class Day extends React.Component {
    render() {
        const { id, dates, bgColor, todayId, holidayNames } = this.props;
        const isToday = id === todayId;
        const tooltip = holidayNames[id] ? holidayNames[id].join(', ') : '';
        const dateVal = dates[id];
        const isWeekend = dateVal !== '' && [0, 6].includes(new Date(this.props.year, this.props.month, dateVal).getDay());
        const dayClass = `date${isToday ? ' today' : ''}${isWeekend ? ' weekend' : ''}`;
        return (
            <div
                id={id}
                className={dayClass}
                style={{ backgroundColor: bgColor[id] || '' }}
                title={tooltip}
            >
                {dates[id]}
            </div>
        );
    }
}

export class Board extends React.Component {
    constructor(props) {
        super(props);
        const now = new Date();
        this.state = {
            states: [
                { id: 1, state: 'United States', code: 'US' },
                { id: 2, state: 'Canada', code: 'CA' },
                { id: 3, state: 'Belgium', code: 'BE' },
                { id: 4, state: 'Spain', code: 'ES' }
            ],
            selectedStateCode: 'IN',
            selectedMonth: now.getMonth(),
            selectedYear: new Date().getFullYear(),
            dates: {},
            bgColor: {},
            holidayNames: {},
            todayId: null,
            holidays: []
        };
    }

    componentDidMount() {
        this.generateCalendar();
    }

    async generateCalendar() {
        const { selectedYear, selectedMonth, selectedStateCode } = this.state;
        const date = new Date(selectedYear, selectedMonth, 1);
        let dates = {};
        let dayId = 0;
        let todayId = null;

        const today = new Date();
        const isCurrentMonth = today.getFullYear() === selectedYear && today.getMonth() === selectedMonth;

        const firstDay = date.getDay();
        for (let i = 0; i < firstDay; i++) {
            dates[dayId++] = '';
        }

        while (date.getMonth() === selectedMonth) {
            const currentDay = date.getDate();
            dates[dayId] = currentDay;

            if (isCurrentMonth && currentDay === today.getDate()) {
                todayId = dayId;
            }

            dayId++;
            date.setDate(date.getDate() + 1);
        }

        const holidays = await this.fetchHolidays(selectedYear, selectedStateCode);
        const bgColor = this.colorWeeks(holidays, selectedYear, selectedMonth, dates);
        const holidayNames = this.mapHolidayNames(holidays, selectedYear, selectedMonth, dates);

        this.setState({ dates, bgColor, todayId, holidayNames, holidays });
    }

    async fetchHolidays(year, countryCode) {
        try {
            const res = await axios.get(`https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`);
            return Array.isArray(res.data) ? res.data : [];
        } catch (err) {
            console.error("Failed to fetch holidays", err);
            return [];
        }
    }

    mapHolidayNames(holidays, year, month, dates) {
        const namesMap = {};
        for (let id in dates) {
            const dateVal = dates[id];
            if (!dateVal) continue;
            const fullDate = new Date(year, month, dateVal);
            const isoDate = fullDate.toISOString().split('T')[0];
            namesMap[id] = holidays
                .filter(h => h.date === isoDate)
                .map(h => h.localName);
        }
        return namesMap;
    }

    getWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }

    colorWeeks(holidays, year, month, dates) {
        const weekMap = {};
        const colorMap = {};

        for (const h of holidays) {
            const date = new Date(h.date);
            if (date.getMonth() !== month) continue;
            const weekNum = this.getWeekNumber(date);
            weekMap[weekNum] = (weekMap[weekNum] || 0) + 1;
        }

        for (let id in dates) {
            const dateVal = dates[id];
            if (!dateVal) continue;
            const fullDate = new Date(year, month, dateVal);
            const weekNum = this.getWeekNumber(fullDate);
            const count = weekMap[weekNum] || 0;

            if (count >= 3) colorMap[id] = '#88b8ff';
            else if (count === 2) colorMap[id] = '#045b33';
            else if (count === 1) colorMap[id] = '#c5fa05';
            else colorMap[id] = '';
        }

        return colorMap;
    }

    selectState = (e) => {
        this.setState({ selectedStateCode: e.target.value }, () => this.generateCalendar());
    };

    selectMonth = (e) => {
        const selectedMonth = parseInt(e.target.value, 10);
        this.setState({ selectedMonth }, () => this.generateCalendar());
    };

    goToPreviousMonth = () => {
        this.setState((prevState) => {
            const newMonth = prevState.selectedMonth - 1;
            const newYear = newMonth < 0 ? prevState.selectedYear - 1 : prevState.selectedYear;
            return {
                selectedMonth: (newMonth + 12) % 12,
                selectedYear: newYear,
            };
        }, this.generateCalendar);
    };

    goToNextMonth = () => {
        this.setState((prevState) => {
            const newMonth = prevState.selectedMonth + 1;
            const newYear = newMonth > 11 ? prevState.selectedYear + 1 : prevState.selectedYear;
            return {
                selectedMonth: newMonth % 12,
                selectedYear: newYear,
            };
        }, this.generateCalendar);
    };

    handleYearChange = (e) => {
        const year = parseInt(e.target.value, 10);
        this.setState({ selectedYear: year }, () => {
            this.generateCalendar(this.state.selectedMonth, year, this.state.stateCode);
        });
    };

    render() {
        const { dates, bgColor, todayId, holidayNames, selectedMonth, selectedYear } = this.state;

        return (
            <div>
                <h2>Holiday Calendar</h2>
                <div className="controls">
                    <select onChange={this.selectState}>
                        {this.state.states.map((state) => (
                            <option key={state.code} value={state.code}>
                                {state.state}
                            </option>
                        ))}
                    </select>

                    <div className="month-nav">
                        <button onClick={this.goToPreviousMonth}>◀</button>
                        <span>{new Date(selectedYear, selectedMonth).toLocaleString('default', {
                            month: 'long',
                            year: 'numeric'
                        })}</span>
                        <button onClick={this.goToNextMonth}>▶</button>
                    </div>
                    <div className="year-select">
                        <label>Year: </label>
                        <select value={this.state.selectedYear}
                                onChange={this.handleYearChange}>
                            {Array.from({length: 21}, (_, i) => {
                                const year = 2010 + i;
                                return <option key={year}
                                               value={year}>{year}</option>;
                            })}
                        </select>
                    </div>
                </div>

                <div className="calendar-grid">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                        <div key={d} className="day-label">{d}</div>
                    ))}
                    {Object.keys(dates).map((id) => (
                        <Day
                            key={id}
                            id={id}
                            dates={dates}
                            bgColor={bgColor}
                            todayId={todayId}
                            holidayNames={holidayNames}
                        />
                    ))}
                </div>
                <div className="holiday-list">
                    <h3>Holidays This Month</h3>
                    <ul>
                        {this.state.holidays
                            .filter(h => {
                                const date = new Date(h.date);
                                return date.getFullYear() === this.state.selectedYear &&
                                    date.getMonth() === this.state.selectedMonth;
                            })
                            .map((h, index) => (
                                <li key={index}>
                                    <strong>{new Date(h.date).toDateString()}:</strong> {h.localName}
                                </li>
                            ))}
                    </ul>
                </div>
            </div>
        );
    }
}
