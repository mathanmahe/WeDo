from datetime import datetime,timedelta
from calendar import HTMLCalendar 
from .models import Task
from django.db.models import Q

class Calendar(HTMLCalendar):
    def __init__(self,year = None, month = None):
        self.year = year
        self.month = month
        super(Calendar,self).__init__()
    
    def formatday(self,day,tasks,smallScreen):
        tasks_in_day = tasks.filter(postDate__day = day)
        tasks_due_today = tasks.filter(dueDate__day = day)
        d = ''
        if(tasks_in_day):
            d+='<b>Created:</b>\n'
            for t in tasks_in_day:
                d+=f'<li id = "postDate"> {t.body} </li>'
        if(tasks_due_today):
            d+='<b>Due: </b>\n'
            for t in tasks_due_today:
                d+=f'<li id = "dueDate"> {t.body} </li>'
        if(smallScreen=="false"):
            if day!=0 and d!='':
                return f"<td class='date-cell' id='{day}-{self.month}-{self.year}' onClick = 'openDay(this.id)'><span class='date'>{day}</span><ul> {d} </ul></td>"
            elif day!=0:
                return f"<td class='date-cell' id='{day}-{self.month}-{self.year}'><span class='date'>{day}</span><ul> {d} </ul></td>"
        else:
            if day!=0 and d!='':
                return f"<td class='date-cell' id='{day}-{self.month}-{self.year}' onClick = 'tasksInDay(this.id)'><span class='date'>{day}</span><br><i class='fa fa-tasks' id ='day-tasks' ></i></td>"
            elif day!=0:
                return f"<td class='date-cell' id='{day}-{self.month}-{self.year}'><span class='date'>{day}</span></td>"

        return '<td></td>'
    
    def formatweek(self,theweek,tasks,smallScreen):
        week = ''
        for d,weekday in theweek:
            week += self.formatday(d,tasks,smallScreen)
        return f'<tr> {week} </tr>'

    def formatmonth(self,user,smallScreen,withyear = True):
        print("smallscreen ",smallScreen)
        tasks = Task.objects.filter(postDate__year = self.year,postDate__month  =self.month,creator= user)
        cal = f'<table border="0" cellpadding="0" cellspacing="0" class="table table-striped">\n'
        cal += f'<thead class ="thead-dark">{self.formatmonthname(self.year, self.month, withyear=withyear)}</thead>\n'
        cal += f'{self.formatweekheader()}\n'
        for week in self.monthdays2calendar(self.year, self.month):
            cal += f'{self.formatweek(week, tasks,smallScreen)}\n'
        cal+= "</table>"
        return cal