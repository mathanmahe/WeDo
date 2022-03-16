from django.contrib import admin
from django.urls import path
from . import views

urlpatterns = [
    path("", views.index, name="index"),
    path("index",views.index,name = "i"),
    path("login", views.login_view, name="login"),
    path("logout", views.logout_view, name="logout"),
    path("register", views.register, name="register"),
    path("create",views.createTask,name = "createTask"),
    path("email",views.sendEmail,name = "email"),#test remove later

    path("calendar",views.CalendarView.as_view(),name = "calendar"),

    # api routes 
    path("view/<str:taskKey>",views.viewTasks,name = "viewTasks"),
    path("delete/<str:taskId>",views.deleteTask,name = "delete"),
    path("edit/<str:taskId>",views.editTask, name = "edit"),
    path("createFolder",views.createFolder,name = "createFolder"),
    path("viewFolders",views.viewFolders,name = "viewFolders"),
    path("editFolder/<str:folderId>",views.editFolder,name = "editFolder"),
    path("deleteFolder/<str:folderId>",views.deleteFolder,name = "deleteFolder"),
    path("getFolder/<str:folderId>",views.getFolder,name = "getFolder"),
    path("viewDay",views.viewDay,name ="viewDay"),
    path("addTaskToFolder/<str:folderId>",views.addTaskToFolder,name = "addToFolder"),
]