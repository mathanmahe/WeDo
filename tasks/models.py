from django.db import models
from django.contrib.auth.models import AbstractUser
from datetime import date
import pytz
from django.utils.timezone import make_aware
# Create your models here.
class User(AbstractUser):
    pass

class Task(models.Model):
    creator = models.ForeignKey(User,on_delete = models.CASCADE, related_name = "get_creator")
    body = models.CharField(max_length = 100)
    postDate = models.DateTimeField(auto_now_add = True,blank = True,null = True)
    dueDate = models.DateTimeField(blank = True,null = True)
    reminder = models.DateTimeField(blank = True,null = True)
    isActive = models.BooleanField(default = True)
    hasReminded = models.BooleanField(default = False)

    def __str__(self):
        return f"{self.body[:50]}"

    def serialize(self):
        time_zone = pytz.timezone("Singapore")
        if self.dueDate and self.reminder:
            return {
                "id":self.id,
                "creator":self.creator.username,
                "body":self.body,
                "postDate":self.postDate.astimezone(time_zone).strftime("%b %d %Y, %I:%M %p"),
                "dueDate": self.dueDate.astimezone(time_zone).strftime("%b %d %Y, %I:%M %p"),
                "reminder":self.reminder.astimezone(time_zone).strftime("%b %d %Y, %I:%M %p"),
                "isActive":self.isActive,
            }
        if not self.dueDate and not self.reminder:
            return {
                "id":self.id,
                "creator":self.creator.username,
                "body":self.body,
                "postDate":self.postDate.astimezone(time_zone).strftime("%b %d %Y, %I:%M %p"),
                "isActive":self.isActive,
            }
        if self.reminder and not self.dueDate:
            return {
                "id":self.id,
                "creator":self.creator.username,
                "body":self.body,
                "postDate":self.postDate.astimezone(time_zone).strftime("%b %d %Y, %I:%M %p"),
                "reminder":self.reminder.astimezone(time_zone).strftime("%b %d %Y, %I:%M %p"),
                "isActive":self.isActive,
            }
        else:
            return {
                "id":self.id,
                "creator":self.creator.username,
                "body":self.body,
                "postDate":self.postDate.astimezone(time_zone).strftime("%b %d %Y, %I:%M %p"),
                "dueDate":self.dueDate.astimezone(time_zone).strftime("%b %d %Y, %I:%M %p"),
                "isActive":self.isActive,
            }

class Folder(models.Model):
    user = models.ForeignKey(User,on_delete = models.CASCADE,related_name = "get_user")
    title = models.CharField(max_length = 20)
    taskList = models.ManyToManyField(Task, related_name = "get_tasks")

    def __str__(self):
        return f"{self.title}"
    
    def serialize(self):
        return{
            "id":self.id,
            "user":self.user.username,
            "title":self.title,
            "tasks":[task.body for task in self.taskList.all()],
            
        }