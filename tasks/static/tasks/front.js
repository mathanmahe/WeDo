document.addEventListener("DOMContentLoaded",()=>{
    console.log("DOMloaded")

    const queryString = window.location.search;
    // console.log(queryString);
    const urlParams = new URLSearchParams(queryString);
    // console.log(urlParams.has('calendar'));
    
    const pathName = window.location.pathname;
    console.log(pathName)

    // if we are in the index path we will need to enable the view
    if(pathName==="/")
    {
        document.querySelector("#create-task").style.display = "block";
        document.querySelector("#view-task").style.display = "block";
        document.querySelector("#delete-folder-div").style.display = "none";
        viewTasks("all");

        fetch("https://type.fit/api/quotes")
        .then(response=>response.json())
        .then((quotes)=>
        {
            var randomItem = quotes[Math.random() * quotes.length |0];
            console.log(randomItem);
            document.querySelector("#motivational-quote").innerHTML = `\"${randomItem.text}\"`;
            document.querySelector("#quoter").innerHTML =  (randomItem.author)? `${randomItem.author}`:"Unknown"
        })
    }

    // we have pathways listed below for when we press one of the buttons from the calendar interface
    if(urlParams.has('taskKey'))
    {
        viewTasks(urlParams.get('taskKey'))
        document.querySelector("#create-task").style.display = "none";
    }
    else if (urlParams.has("openFolder"))
    {
        console.log("current link")
        console.log("openFolder:",urlParams.get("openFolder"))
        //now i need a api request to get a folder object
        let folderId = urlParams.get("openFolder");
        fetch(`getFolder/${folderId}`)
        .then(response => response.json())
        .then(folder=>
            {
                console.log(folder);
                openFolder(folder);
            })
        // openFolder(urlParams.get("openFolder"))
    }
    else if(urlParams.has('createFolder'))
    {
        createFolder();
    }

    //  i can have multiple urlParams that indicate which section i am exactly going to
    // i need to disable the default mechanism that occurs when i press the navbar


    document.querySelector("#create-folder").addEventListener("click",()=>
    {
        if(pathName === "/calendar")
        {
            window.location.href = `index?createFolder=1`;
        }
        else
        {
            closeMenu();
            createFolder();

        }
    });
    document.querySelector("#folder-button").addEventListener("click",()=>{
        viewFolders();
    });
//    const hamburger = document.querySelector(".hamburger");
//    const navMenu = document.querySelector(".nav-menu");
//    const navLink = document.querySelectorAll(".nav-link");
   let hamState=0;
   hamburger.addEventListener("click", ()=>{
        if(hamState==0)
            mobileMenu()
        else
            closeMenu();
        hamState = 1- hamState;
   });
   navLink.forEach(n => n.addEventListener("click", closeMenu));
   


})

function mobileMenu() {
    hamburger.classList.toggle("active");
    navMenu.classList.toggle("active");
    document.querySelector(".card").style="display:none;";
}

function closeMenu() {
    hamburger.classList.remove("active");
    navMenu.classList.remove("active");
    document.querySelector(".card").style="display:block;";
}

function openDay(clicked_id)
{
    
    window.location.href = `index?taskKey=${clicked_id}`;
    // console.log(`the item ${clicked_id} was clicked`);
    // viewTasks(clicked_id);
}

function tasksInDay(clicked_id)
{
    fetch(`viewDay?day=${clicked_id}`)
    .then(response=>response.json())
    .then(tasks=>{
        console.log(tasks)
        const parent = document.querySelector("#tasks-in-day");
        parent.innerHTML = "";
        const title = document.createElement("div");
        title.innerHTML = `Tasks for ${clicked_id}`;
        parent.append(title);
        const list = document.createElement("ul");
        parent.append(list);
        tasks.forEach(task=>{
            const body = document.createElement("li");
            body.id = `dayTask-div-${task.id}`;
            body.innerHTML = task.body;
            list.append(body);
        })
    })
}

function createFolder()
{
    //will send post request to create a new folder using fetch 
    fetch(`createFolder`,{
        method: "POST"
    })
    .then(response =>response.json())
    .then(folder=>{
        openFolder(folder);
    })

}

function viewFolders()
{
    const path = window.location.pathname;
    console.log(path);
    console.log("viewing all folders now ");
    fetch("viewFolders")
    .then(response => response.json())
    .then(folders=>
        {
            console.log(folders);
            const folderList = document.getElementById("folder-list");
            folderList.innerHTML = "";
            folders.forEach((thisFolder)=>
            {
                const folder = document.createElement("a");
                folder.href = "#";
                folder.innerHTML = thisFolder.title;
                folder.id = thisFolder.id;
                folder.onclick = function handler()
                {
                    if(path==="/calendar")
                    {
                        window.location.href = `index?openFolder=${thisFolder.id}`;
                    }
                    else
                    {
                        closeMenu();
                        openFolder(thisFolder);
                    }
                        
                };
                folderList.append(folder);
            })
        })
}

function addTaskToFolder(thisTask) {
    fetch("viewFolders")
    .then(response => response.json())
    .then(folders=>
        {
            console.log(folders)
            const folderList = document.getElementById("addFolder-list");
            folderList.innerHTML = "";
            folders.forEach((thisFolder)=>
            {
                const folder = document.createElement("a");
                folder.href = "#";
                folder.innerHTML = thisFolder.title;
                folder.id = thisFolder.id;
                folderList.append(folder);
                folder.onclick = function handler()
                {
                        const contextMenu = document.getElementById("context-menu");
                        contextMenu.classList.remove("visible");
                        //function to add the mentioned task to folder
                        fetch(`addTaskToFolder/${thisFolder.id}`,{
                            method:"PUT",
                            body:JSON.stringify({
                                taskId: thisTask.id
                            })
                        })
                        .then(response=>response.json())
                        // openFolder(thisFolder);
                };
                
            })
        })
}

// let title = "";
function openFolder(thisFolder)
{
    localStorage.clear();
    console.log(thisFolder);
    console.log(`opening ${thisFolder.title} now`);
    const folderName = document.querySelector("#task-title");

    folderName.innerHTML = thisFolder.title;
    
    document.querySelector("#delete-folder-div").style.display = "block";
    const deleteFolderButton = document.querySelector("#delete-folder-button");
    deleteFolderButton.addEventListener("click",()=>{
        deleteFolder(thisFolder);
    })

    let folderState =0;
    viewTasks(thisFolder.title);
    folderName.addEventListener("dblclick",(event)=>{

        event.preventDefault();
        // event.stopImmediatePropagation();
        if(folderState==0)
            editFolderName(thisFolder);
        if(folderState==1)
        {
            saveFolderName(thisFolder,folderName.innerHTML);
        }
            
            // save this folder
        folderState = 1- folderState;
    });
    
    
    const folderForm = document.querySelector("#create-task-form");
    folderForm.addEventListener("submit", (event)=>{
        event.preventDefault();

        let csrftoken = getCookie('csrftoken');
        console.log(csrftoken);
        folderForm.submit();
        setTimeout(()=>{
            openFolder(thisFolder);
        },500);
    })
}

// function to get the csrf token when needed
function getCookie(name) {
    var cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        var cookies = document.cookie.split(';');
        for (var i = 0; i < cookies.length; i++) {
            var cookie = cookies[i].trim();
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

function viewTasks(taskKey)
{
    localStorage.clear();
    console.log(`Viewing ${taskKey} tasks now `);
    if (taskKey =="all")
    {
        document.querySelector("#task-title").innerHTML= "All Tasks";
        document.querySelector("#folder-input").value = "";
    }
    else if(taskKey.includes("-") )
    {
        document.querySelector("#task-title").innerHTML= `Tasks for ${taskKey}`;
        document.querySelector("#folder-input").value = "";
        
    }
    
    else
    {
        document.querySelector("#task-title").innerHTML = taskKey;
        document.querySelector("#folder-input").value = taskKey;
    }

    fetch(`view/${taskKey}`)
    .then(response=>response.json())
    .then(tasks =>{
        const parent= document.getElementById("view-task");
        parent.innerHTML = "";
        console.log(tasks)
        tasks.forEach(task=>{
            buildTask(task,taskKey);
        })
    })
}

function updateTaskStatus(thisTask,body) {
    if(thisTask.isActive) {
        body.innerHTML = thisTask.body;
        body.style = "background-color: lavender";
    }
        
    else {
        body.innerHTML = `<strike>${thisTask.body}`;
        // body.style = "background-color: lightgreen";
    }
        
}

function buildTask(thisTask,taskKey)
{
    const task = document.createElement("div");
    task.id = `task-div-${thisTask.id}`;
    task.className = "row"

    const deleteDiv = document.createElement("div");
    const deleteButton = document.createElement("button");
    deleteDiv.className = "col-1 delete";
    deleteButton.innerHTML = "<i class='fa fa-trash'></i>";
    deleteButton.className = "btn";
    deleteDiv.addEventListener("mouseenter",()=>{
        // deleteDiv.innerHTML = "<button class='btn'><i class='fa fa-trash'></i></button>";
        deleteDiv.append(deleteButton);
        deleteButton.innerHTML = "<i class='fa fa-trash'></i>";
    })
    deleteDiv.addEventListener("mouseleave",()=>{
        // deleteDiv.innerHTML = "";
        deleteButton.innerHTML = "";
        
    })
    // deleteDiv.className = "col-1 delete";
    deleteDiv.addEventListener("click",(event)=>{
        deleteTask(thisTask,taskKey,event);
    })


    const body = document.createElement("div");
    body.id = `body-div-${thisTask.id}`;
    body.className = "col-8 col-sm-8 col-lg-6"
    updateTaskStatus(thisTask,body);
    // if(thisTask.isActive)
    //     body.innerHTML = thisTask.body;
    // else
    //     body.innerHTML = `<strike>${thisTask.body}`



        let editState =0;
    

    const contextMenu = document.getElementById("context-menu");
    
    body.addEventListener("dblclick",(event)=>
    {
        
        event.preventDefault();
        event.stopImmediatePropagation();
        
        
        if (editState ==0)
            editTask(thisTask);
        if(editState==1)
        {
            saveTask(thisTask,body.innerHTML);
            
        }
        editState = 1- editState;
        
    })
    
    let infoState=0;
    let rightState=0;
    body.addEventListener("contextmenu",(event)=>{
        event.preventDefault();
        event.stopImmediatePropagation();
        console.log(`right click for ${thisTask.id}`);
        if (!contextMenu.classList.contains("visible"))
        // if(rightState==0)
        {

    
            const {clientX:mouseX,clientY: mouseY} = event;
    
            const { normalizedX, normalizedY } = normalizePozition(mouseX, mouseY);
            // contextMenu.style.top = `${mouseY}px`;
            // contextMenu.style.left = `${mouseX}px`;
            contextMenu.style.top = `${normalizedY}px`;
            contextMenu.style.left = `${normalizedX}px`;
    
            // setContextMenuPostion(event,contextMenu);
            contextMenu.classList.add("visible");
            
            const editButton  = document.querySelector("#edit-button");
            const infoButton = document.querySelector("#info-button");
            const deleteButton = document.querySelector("#delete-button");
            const addToFolderButton = document.querySelector("#addToFolder-button");

            editButton.onclick = function() {
                editState=1;
                editTask(thisTask);
                contextMenu.classList.remove("visible");
            }
            infoButton.onmousedown = function() {
                showInfo(thisTask);
            }
            infoButton.onmouseup = function() {
                if(thisTask.isActive)
                    body.innerHTML = thisTask.body;
                else
                    body.innerHTML = `<strike>${thisTask.body}`
                contextMenu.classList.remove("visible");
            }
            deleteButton.onclick = function() {
                deleteTask(thisTask,taskKey,event);
                contextMenu.classList.remove("visible");
            }
            addToFolderButton.onclick = function() {
                addTaskToFolder(thisTask);
            }

        }
        // if (rightState==1)
        else
        {
            // if(e.target.offsetParent != contextMenu)
            event.preventDefault();
            event.stopImmediatePropagation();
            contextMenu.classList.remove("visible");
            // saveTask(thisTask);
        }
        // rightState= 1-rightState;
    });

    // body.addEventListener("click",(e)=>
    // {
    //     if(e.target.offsetParent != contextMenu)
    //     contextMenu.classList.remove("visible");
    //     // saveTask(thisTask);
    // })

    const buttonDiv = document.createElement("div");
    buttonDiv.id = `button-div`;
    buttonDiv.className = "col-1";

    const button = document.createElement("input");
    button.id = `button-box-${thisTask.id}`;
    
    button.type = "checkbox";
    button.class = "checkbox-round";
    button.checked = (thisTask.isActive)? false: true;
    // if(thisTask.isActive)
    //     button.checked = false;
    // else
    //     button.checked = true;
    button.addEventListener("click",()=>{
        // if(thisTask.isActive)
        if(button.checked==true)
        {
            completeTask(thisTask,taskKey,false);
            body.innerHTML = `<strike>${thisTask.body}`
            // button.checked = true;
        }
            
        // if(!thisTask.isActive)
        else
        {
            completeTask(thisTask,taskKey,true);
            body.innerHTML = thisTask.body;
            // button.checked = false;
        }
    })


    buttonDiv.append(button);
    task.append(deleteDiv,body,buttonDiv);

    const parent = document.getElementById("view-task");
    parent.append(task);
    const spacer = document.createElement("br");
    spacer.id = `spacer-${thisTask.id}`;
    parent.append(spacer);
}

function completeTask(thisTask,taskKey,taskState)
{
    fetch(`edit/${thisTask.id}`,{
        method: 'PUT',
        body: JSON.stringify({
            isActive: taskState
          })
        })
    // .then(viewTasks(taskKey));
}
// function deleteTask(thisTask,taskKey)
// {

//     fetch(`delete/${thisTask.id}`,{
//         method: "DELETE",
//     })
//     .then(response=> response.json())
//     .then(response=>{
//         console.log(response)
//         viewTasks(taskKey)
//     })
// }

function deleteTask(thisTask,taskKey,event)
{

    console.log("delete")
    const element = event.target;
    // console.log(element);
    if( element.className === "col-1 delete" || element.className ==="col-8 col-sm-8 col-lg-6") 
    {
        // console.log(element.parentElement);
        const spacer = document.querySelector(`#spacer-${thisTask.id}`);
        spacer.style.animationPlayState= "running";
        element.parentElement.style.animationPlayState = "running";
        element.parentElement.addEventListener("animationend",()=> {
            element.parentElement.remove();
            spacer.remove();
        });
    }
    else {
        const taskDiv = document.querySelector(`#task-div-${thisTask.id}`);
        const spacer = document.querySelector(`#spacer-${thisTask.id}`);
        taskDiv.style.animationPlayState= "running";
        spacer.style.animationPlayState= "running";
        taskDiv.addEventListener("animationend",()=> {
            taskDiv.remove();
            spacer.remove();
        })
    }

    fetch(`delete/${thisTask.id}`,{
        method: "DELETE",
    })
    .then(response=> response.json())
    .then(response=>{
        console.log(response)
        // viewTasks(taskKey)
    })
}

function deleteFolder(thisFolder)
{
    fetch(`deleteFolder/${thisFolder.id}`,{
        method: "DELETE",
    })
    .then(response=> response.json())
    .then(response=>{
        console.log(response);
    })
    location.reload();
}

function editFolderName()
{
    const folderName = document.getElementById("task-title");
    folderName.style = "background-color: lightgrey";
    folderName.contentEditable = "true";
}

function saveFolderName(thisFolder,name)
{
    console.log("saving folder now")
    const folderName =  document.getElementById("task-title");
    folderName.style = "background-color: white";
    folderName.contentEditable = "false";
    fetch(`editFolder/${thisFolder.id}`,{
        method: 'PUT',
        body: JSON.stringify({
            newName: name
          })
    })
}

function editTask(thisTask)
{
    const body = document.getElementById(`body-div-${thisTask.id}`);
    body.style = "background-color: lightgrey;"
    body.contentEditable = "true";

}
function saveTask(thisTask,n_body)
{
    // function saved task after editing 
    const thisBody = document.getElementById(`body-div-${thisTask.id}`);
    thisBody.style = "background-color: lavender;"
    thisBody.contentEditable = "false";
    fetch(`edit/${thisTask.id}`,{
        method: 'PUT',
        body: JSON.stringify({
            newBody: n_body
          })
        })
}

function showInfo(thisTask)
{
    console.log(`showing info for task no. ${thisTask.id}`);
    const body = document.getElementById(`body-div-${thisTask.id}`);

    if (thisTask.dueDate)
        body.innerHTML = `Created: ${thisTask.postDate}<br>Due: ${thisTask.dueDate}`
    else
        body.innerHTML = `Created on ${thisTask.postDate}`
}

const contextMenu = document.getElementById("context-menu");
      const scope = document.querySelector("body");
const normalizePozition = (mouseX, mouseY) => {
    // ? compute what is the mouse position relative to the container element (scope)
    let {
        left: scopeOffsetX,
        top: scopeOffsetY,
    } = scope.getBoundingClientRect();
    
    scopeOffsetX = scopeOffsetX < 0 ? 0 : scopeOffsetX;
    scopeOffsetY = scopeOffsetY < 0 ? 0 : scopeOffsetY;
    
    const scopeX = mouseX - scopeOffsetX;
    const scopeY = mouseY - scopeOffsetY;

    // ? check if the element will go out of bounds
    const outOfBoundsOnX =
        scopeX + contextMenu.clientWidth > scope.clientWidth;

    const outOfBoundsOnY =
        scopeY + contextMenu.clientHeight > scope.clientHeight;

    let normalizedX = mouseX;
    let normalizedY = mouseY;

    // ? normalize on X
    if (outOfBoundsOnX) {
        normalizedX =
        scopeOffsetX + scope.clientWidth - contextMenu.clientWidth;
    }

    // ? normalize on Y
    if (outOfBoundsOnY) {
        normalizedY =
        scopeOffsetY + scope.clientHeight - contextMenu.clientHeight;
    }

    return { normalizedX, normalizedY };
};