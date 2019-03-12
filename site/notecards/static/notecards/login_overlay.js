/* Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
 * Licensed under the terms of the MIT license.
 */

const LoginOverlay = (function() {

    function LoginOverlay(zIndex)
    {
        var overlay = null;
        var usernameInput = null;
        var passwordInput = null;
        var errorMessageContainer = null;

        var eventListeners = new EventListenersCollection();
        eventListeners.registerEventType('logged_in');
        eventListeners.registerEventType('hidden');

        function createOverlay(zIndex)
        {
            var template = document.createElement('template');
            template.innerHTML = htmlTemplate.trim();
            var rootElement = document.importNode(template.content.firstChild, true);

            overlay = new Overlay(zIndex, "LOGIN");
            overlay.insert(rootElement);
            overlay.setCloseButtonClickedListener(hide);

            usernameInput = document.getElementById("login_username_input");
            passwordInput = document.getElementById("login_password_input");
            errorMessageContainer = document.getElementById("login_error_message_container");

            document.getElementById('login_overlay_form').addEventListener('submit', evt=>{
                evt.stopPropagation();
                evt.preventDefault();

                login();
            });
        }

        function login()
        {
            var username = usernameInput.value;
            var password = passwordInput.value;

            CardApi.login(username, password, ()=>{
                eventListeners.dispatchEvent({type: 'logged_in'});
                hide();
            }, (message)=>{
                errorMessageContainer.innerHTML = message;
                $(errorMessageContainer).show();
            });
        }

        function hide()
        {
            overlay.hide();
            eventListeners.dispatchEvent({type: 'hidden'});
        }

        /*
         * Define the external API.
         */

        this.show = function()
        {
            usernameInput.value = "";
            passwordInput.value = "";

            $(errorMessageContainer).hide();

            overlay.show();

            usernameInput.focus();
        }

        this.addEventListener = function(eventType, listener)
        {
            eventListeners.addEventListener(eventType, listener);
        }

        this.removeEventListener = function(eventType, listener)
        {
            eventListeners.removeEventListener(eventType, listener);
        }

        createOverlay(zIndex);
    }


    var htmlTemplate = `
    <div id="tag_overlay_panel" style="position:absolute; left:0px; right:0px; bottom: 0px; top:0px; display:flex;flex-direction:column;">

        <form id="login_overlay_form">
            <div id="login_error_message_container">This is a test</div>
            <input type="text" name="login_username_input" id="login_username_input" placeholder="username" />
            <input type="password" name="login_password_input" id="login_password_input" placeholder="password" />

            <input data-inline="true" type="submit" data-mini="true" value="Login" />
        </form>

    </div>`;


    return LoginOverlay;
})();

