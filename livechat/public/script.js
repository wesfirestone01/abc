let socket = io(); 

let formeElm = document.querySelector("#chatForm");
console.log(formeElm);
let msgInput = document.querySelector("#newMessage");
console.log(msgInput)


// LISTEN FOR NEWLY TYPED MESSAGES, 
// SEND THEM TO THE SERVER
formeElm.addEventListener("submit", newMessagesSubmitted);

function newMessagesSubmitted(event){
    console.log(event);
    //stop form element from refreshing the page
    event.preventDefault();

    let newMsg = msgInput.value
    console.log(newMsg);
    console.log()

    appendMessage(newMsg); // just for fun,
    // actuaally we need to
    // send the new message to 
    // the server first:


    socket.emit("message",newMsg); 

    
    // clear out input:
    msgInput.value = "";

}



// LISTEN FOR NEW MESSAGES FROM SERVER
// APPEND THEM TO THE MESSAGE BOX
// AUTO SCROLL TO BOTTOM

// APPEND MESSAGES TO BOX
function appendMessage(txt){
    console.log(txt)
    // select list (ul) first
    let chatThreadList = document.querySelector("#threadWrapper ul");
    console.log(chatThreadList)

    // create new list item (li)
    let newListItem = document.createElement("li");
    newListItem.innerText = txt;

    const fullWidth = window.innerWidth;
    const fullHeight = window.innerHeight;

  
    const elem = document.createElement("div");
    elem.textContent = txt;
    elem.style.position = "absolute";
    elem.style.left = Math.round(Math.random() * (fullWidth - 100)) + "px";
    elem.style.top = Math.round(Math.random() * (fullHeight - 30)) + "px";
    elem.style.background = "rgba(142, 225, 123, 0.8)";
    elem.style.padding = "4px 8px";
    elem.style.borderRadius = "6px";
    elem.style.fontFamily = "sans-serif";
    

    document.body.appendChild(elem);
}




// OPTIONAL: LISTEN FOR NEW NAME
// SEND IT TO SERVER