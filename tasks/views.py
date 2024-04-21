from django.contrib.auth import authenticate, login, logout
from django.db import IntegrityError
from django.http import HttpResponse, HttpResponseRedirect, JsonResponse
from django.shortcuts import render
from django.urls import reverse
from django.forms import ModelForm
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
import json
from .models import User,Folder,Task
import dateutil.parser as dparser
from django.utils.timezone import make_aware,activate,now as timeNow
from django.core.mail import send_mail
from wedo.settings import EMAIL_HOST_USER
import threading
from threading import Timer
import datetime
import calendar 
from calendar import HTMLCalendar
from .utils import Calendar
from django.views import generic
from django.utils.safestring import mark_safe
# from django.conf import settings
# activate(settings.TIME_ZONE)
# Create your views here.

#thread class to send a repeated email every day 
class RepeatedTimer(object):
    def __init__(self, interval, function, *args, **kwargs):
        self._timer     = None
        self.function   = function
        self.interval   = interval
        self.args       = args
        self.kwargs     = kwargs
        self.is_running = False
        self.start()

    def _run(self):
        self.is_running = False
        self.start()
        self.function(*self.args, **self.kwargs)

    def start(self):
        if not self.is_running:
            self._timer = Timer(self.interval, self._run)
            self._timer.start()
            self.is_running = True

    def stop(self):
        self._timer.cancel()
        self.is_running = False

class CalendarView(generic.ListView):
    model = Task
    template_name = "tasks/calendar.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        # use today's date for the calendar
        d = get_date(self.request.GET.get('month', None))

        # Instantiate our calendar class with today's year and date
        cal = Calendar(d.year, d.month)

        # Call the formatmonth method, which returns our calendar as a table
        html_cal = cal.formatmonth(self.request.user,self.request.GET.get('smallScreen'),withyear=True)
        context['calendar'] = mark_safe(html_cal)
        context['previous_month'] = previousMonth(d)
        context['next_month'] = nextMonth(d)
        return context

def previousMonth(d):
    first = d.replace(day=1)
    # timedelta function is used to calculate difference between dates
    prevMonth = first - datetime.timedelta(days=1)
    month = 'month=' + str(prevMonth.year) + '-' +str(prevMonth.month)
    return month

def nextMonth(d):
    daysInMonth = calendar.monthrange(d.year,d.month)[1]
    last = d.replace(day = daysInMonth)
    nextMonth = last + datetime.timedelta(days=1)
    month = 'month=' + str(nextMonth.year) +'-'+str(nextMonth.month)
    return month


def get_date(req_day):
    if req_day:
        year, month = (int(x) for x in req_day.split('-'))
        return datetime.date(year, month, day=1)
    return datetime.datetime.today()

def index(request):
    print("user: ",request.user)
    if(request.user.is_anonymous):
        return render(request,"tasks/login.html")
    elif(request.user is not None):
        x = threading.Thread(target = thread_email_reminder, args= (request,))
        x.start()
        rt = RepeatedTimer(86400,thread_email_reminder,request)
        # t = threading.Timer(5.0,thread_email_reminder,[request])
        return render(request,"tasks/index.html")


def contains_word(s,w):
    return(' '+w+' ') in (' '+s+' ')

@login_required 
def viewDay(request):
    if request.method == "GET":
        if request.GET.get('day') is not None:
            day = dparser.parse(request.GET.get('day'),dayfirst = True)
            dayTasks = Task.objects.filter(creator = request.user,postDate__date = day)
            return JsonResponse([t.serialize() for t in dayTasks],safe = False)


@login_required
def createTask(request):
    # print("is thread alive",t.is_alive())
    if request.method != "POST":
        return JsonResponse({"error":"POST request required"},status = 400)
    print(request.POST)
    newTask = Task(body = request.POST.get("body"))
    newTask.creator = request.user
    print(contains_word("on",request.POST.get("body")))
    if contains_word(request.POST.get("body"),"on"):
        print(request.POST.get("body"))
        try:
            newTask.dueDate = dparser.parse(request.POST.get("body"),fuzzy = True,dayfirst = True)
            newTask.dueDate = make_aware(newTask.dueDate)
            print(newTask.dueDate)
        except dparser.ParserError:
            print("WARNING, String does not contain date")

    newTask.save()

    if(request.POST.get("folder") is not None):
        if(request.POST.get("folder")!=""):
            folder = Folder.objects.get(title = request.POST.get("folder"))
            folder.taskList.add(newTask)
            folder.save()
            return HttpResponse(status=204)
            # return JsonResponse(folder.serialize(),safe = False)
        # return JsonResponse({"Success": "task created successfully"},status = 400)
    return HttpResponseRedirect(reverse("index"))

@login_required
@csrf_exempt
def createFolder(request):
    if request.method != "POST":
        return JsonResponse({"error":"POST request required"},status = 400)
    print(request.POST)
    newFolder = Folder(title = "Untitled")
    newFolder.user = request.user
    newFolder.save()
    newFolder.title = newFolder.title+f"{newFolder.id}"
    newFolder.save()
    return JsonResponse(newFolder.serialize(),safe = False)

def login_view(request):
    if request.method == "POST":
        username = request.POST["username"]
        password = request.POST["password"]
        user = authenticate(request,username = username,password = password)

        if user is not None:
            login(request,user)
            return HttpResponseRedirect(reverse("index"))
        else:
            return render(request,"tasks/login.html",{
                "message": "Invalid username and/or password."
            })
    else:
        return render(request,"tasks/login.html")

def logout_view(request):
    logout(request)
    return HttpResponseRedirect(reverse("index"))

def register(request):
    if request.method == "POST":
        username = request.POST["username"]
        email = request.POST["email"]

        # Ensure password matches confirmation
        password = request.POST["password"]
        confirmation = request.POST["confirmation"]
        if password != confirmation:
            return render(request, "tasks/register.html", {
                "message": "Passwords must match."
            })

        # Attempt to create new user
        try:
            user = User.objects.create_user(username, email, password)
            user.save()
        except IntegrityError:
            return render(request, "tasks/register.html", {
                "message": "Username already taken."
            })
        login(request, user)
        return HttpResponseRedirect(reverse("index"))
    else:
        return render(request, "tasks/register.html")


#functions that will handle the API calls to the server 


# this is a function that will show all the tasks
@login_required
def viewTasks(request,taskKey):
    date = None
    print("taskKey: ",taskKey)
    try:
        date = dparser.parse(taskKey,dayfirst = True)
        print("date is : ",date)
    except dparser.ParserError:
        date = None
        print("WARNING, String does not contain date")

    if taskKey =="all":
        allTasks = Task.objects.filter(creator = request.user)
        return JsonResponse([task.serialize() for task in allTasks],safe=False)
    elif date is not None:
        date = make_aware(date)
        todayTasks = Task.objects.filter(postDate__date = date)
        return JsonResponse([task.serialize() for task in todayTasks],safe=False)
    else:
        folder = Folder.objects.get(title = taskKey)
        # print(Task.get_tasks.all())
        taskJSON = [task.serialize() for task in folder.taskList.all()]
        return JsonResponse(taskJSON,safe = False)
    
@login_required
@csrf_exempt
def deleteTask(request,taskId):
    if request.method == "DELETE":
        taskObject = Task.objects.get(id = taskId)
        if(taskObject.creator == request.user):
            taskObject.delete()
            return JsonResponse({"message": "Task deleted successfully."}, status=201)
        else:
            return JsonResponse({"error": "Invalid action."}, status=404)
    else:
        return JsonResponse({"error": "Invalid action."}, status=404)

@login_required
@csrf_exempt
def deleteFolder(request,folderId):
    if request.method =="DELETE":
        folder = Folder.objects.get(id = folderId)
        if(folder.user == request.user):
            folder.delete()
            return JsonResponse({"message": "Folder deleted successfully"},status = 201)
        else:
            return JsonResponse({"error":"Invalid action."},status = 404)
    else:
        return JsonResponse({"error":"Invalid action."},status = 404)

@login_required
@csrf_exempt
def editTask(request,taskId):
    #i need one option to edit the task
    #another option to mark task as completed
    if request.method=="PUT":
        data = json.loads(request.body)
        taskObject = Task.objects.get(id = taskId)
        if data.get("isActive") is not None:
            print("data.get(isActive)",data.get("isActive"))
            taskObject.isActive = data.get("isActive")
        if data.get("newBody") is not None:
            print(data)
            taskObject.body = data.get("newBody")
        taskObject.save()
        return HttpResponse(status = 201)
    else:
        return JsonResponse({
            "error": "GET or PUT request required."
        }, status=400)

@login_required
@csrf_exempt
def addTaskToFolder(request,folderId):
    if request.method=="PUT":
        data = json.loads(request.body)
        if data.get("taskId") is not None:
            folderObject = Folder.objects.get(id = folderId)
            taskId = data.get("taskId")
            task = Task.objects.get(id = taskId)
            folderObject.taskList.add(task)
            folderObject.save()
            return HttpResponse(status = 201)
    else:
        return JsonResponse({"error": "PUT request required"},status = 400)
            

@login_required 
@csrf_exempt 
def editFolder(request,folderId):
    if request.method=="PUT":
        data = json.loads(request.body)
        folderObject = Folder.objects.get(id = folderId)
        if data.get("newName") is not None:
            print(data)
            folderObject.title = data.get("newName")
        folderObject.save()
        return HttpResponse(status = 201)
    else:
        return JsonResponse({
            "error": "GET or PUT request required."
        }, status=400)

@login_required
def viewFolders(request):
    allFolders = Folder.objects.filter(user = request.user)
    return JsonResponse([f.serialize() for f in allFolders],safe = False)

@login_required 
def getFolder(request,folderId):
    if request.method=="GET":
        folderObject = Folder.objects.get(id = folderId)
        return JsonResponse(folderObject.serialize(),safe = False)
    return HttpResponse(status = 404)

@login_required
def sendEmail(request):
    print("sending an email now")
    userObject = User.objects.get(username = request.user) 
    recipient = userObject.email
    print([recipient])
    subject = "test task due on testdate"
    message = "You have a task named test that is due on testdate"
    send_mail(subject,message,EMAIL_HOST_USER,[recipient],fail_silently = False)
    return HttpResponse("Email sent successfully")

@login_required
def sendEmail(request,task):
    print("sending an email now")
    userObject = User.objects.get(username = request.user) 
    recipient = userObject.email
    print([recipient])
    subject = task.body
    message = f"Dear {request.user}, \n\nYour task {task.body} is due today. \n\nSincerely,\nWeDo Task Manager"
    send_mail(subject,message,EMAIL_HOST_USER,[recipient],fail_silently = False)
    return HttpResponse("Email sent successfully")

@login_required
def thread_email_reminder(request):
    # this should check if date is equal to current date
    # now = datetime.datetime.now()
    now = timeNow()
    dateNow = datetime.date.today()
    print(now)
    tasklist = Task.objects.filter(creator=request.user).all().order_by("dueDate")
    for task in tasklist:
        if(task.dueDate):
            print("now",now,"task.dueDate: ",task.dueDate)
            if task.dueDate<= now and not task.hasReminded:
                # send an email
                sendEmail(request,task)
                task.hasReminded = True
                task.save()
    

