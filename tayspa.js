/*
* syntax:
class="tays-var" tays-var="var_name"
class="tays-var" tays-var="var_name"
class="tays-controller" tays-controller="controller_name" ->note that controller must be defined with view
class="tays-if" tays-if="statement" todo
    tays-if will display element if true
*/

String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

function Deferred(){
  this._done = [];
  this._fail = [];
}

Deferred.prototype = {
  execute: function(list, args){
    var i = list.length;
    args = Array.prototype.slice.call(args);

    while(i--) list[i].apply(null, args);
  },
  resolve: function(){
    this.execute(this._done, arguments);
  },
  reject: function(){
    this.execute(this._fail, arguments);
  }, 
  done: function(callback){
    this._done.push(callback);
  },
  fail: function(callback){
    this._fail.push(callback);
  }  
}

    var controllers=[];
function TaysController(){
    this.config={};
    this.config.username="";
    this.config.password="";
    this.config.base_url="";
    this.config.headers=[
        {
            "name":"Authorization",
            "value":'Basic '+ window.btoa(this.config.username+":"+this.config.password)
        }
    ];
    var thus=this;
    this.array_vars={
           add:function(tvar,tval) {
                this[tvar]=[];
                this[tvar].element=document.querySelector('[tays-foreach="'+tvar+'"]');
                this[tvar].firstInnerHTML=document.querySelector('[tays-foreach="'+tvar+'"]').innerHTML;
                //dfine common arrat stuff here with dom updates
               this[tvar]._set=function(push_object){
                    this.length=0;
                    for (var i = 0; i < push_object.length; i++) {
                        this._push(push_object[i]);
                        this.length=(i+1);
                    };
                    this.repaint_list();
                };
                this[tvar]._push=function(push_object){

                     //push can also update if key exists
                    if(push_object.unique_key){

                        var splice_index=this._index_of_key(push_object.unique_key);
                             if(splice_index !==false){
                                this.splice(splice_index,1,push_object);
                             }else{
                                this.push(push_object);
                             }
                    }else{
                        this.push(push_object);
                    }

                     this.repaint_list();
                };
                this[tvar].repaint_list=function(){
                  this.element.innerHTML='';//clear it out
                        for(var i=0;i<this.length;i++) {
                                var list_holder = document.createElement("div");
                                 list_holder.className = "tays_list_holder";
                                 list_holder.innerHTML = thus.parseJSVariables(this.firstInnerHTML,this[i]);
                                 this.element.appendChild(list_holder);
                                 //be sure to add listeners to new elements
                                 thus.setupClickListeners(list_holder);
                                 thus.setupChangeListeners(list_holder);
                        }
                            //this ensure we update dom
                            //document.body.focus();
                            //we need to update listiners
                };
                this[tvar]._index_of_key=function(key_value){
                    
                        for(var i=0;i<this.length;i++) {
                            if(this[i].unique_key==key_value){
                                    return i;
                            }
                        }
                    return false;
                };
                this[tvar]._remove_by_key=function(key_value){
                    var splice_index=this._index_of_key(key_value);
                    if(splice_index !==false){
                        this.splice(splice_index,1);
                        this.repaint_list();
                    }
                };
           }
        };

    this.vars={
        set:function(tvar,tval){
            var _index = tvar.indexOf('.')
            if(_index > -1){
                var split_tvar=tvar.split('.');
                var object_name=split_tvar[0];
                var object_prop=split_tvar[1];
                if(this[object_name] && this[object_name][object_prop]){
                     this[object_name][object_prop]=tval;
                }
            }else{
                this[tvar]=tval;
            }
            // test if tval is object
           if(typeof tval === 'object'){

                for (var key in tval) {
                   var var_name=tvar+'.'+key;
                   var elements=document.querySelectorAll('[tays-var="'+var_name+'"]');
                    for (i = 0; i < elements.length; i++) {
                            thus.bindDataUpdateDom(elements[i],var_name);
                    }
                }
           }else{
                var elements=document.querySelectorAll('[tays-var="'+tvar+'"]');
                for (i = 0; i < elements.length; i++) {
                    thus.bindDataUpdateDom(elements[i],tvar);
                }
          }
        },
        get:function(tvar){
            
            //we may be propery of object
            var _index = tvar.indexOf('.')
            if(_index > -1){
                var split_tvar=tvar.split('.');
                var object_name=split_tvar[0];
                var object_prop=split_tvar[1];
                 if(!this[object_name] || !this[object_name][object_prop]){
                    return "";
                }else{
                    return  this[object_name][object_prop];
                }
            }

            //if we are undefined just return empty string
            if(!this[tvar]){
                return "";
            }
            return this[tvar];
        }
        
    };

    this.view="index";
    this.app_container=document.getElementById("tays_app_main");
}

TaysController.prototype.parseJSVariables=function(content,vars_list){
    
    for(key in vars_list) {
        content=content.replaceAll("{{"+key+"}}",vars_list[key]);
    }
    return content;
}
TaysController.prototype.read_file=function(file,method,params,headers){
    if(typeof params === 'undefined') {
         params = null;
    }else{
        var params = JSON.stringify(params);
    }
    if(typeof method === 'undefined') {
         method = 'GET';
    };

    var d = new Deferred();
    var rawFile = new XMLHttpRequest();
        rawFile.open(method, file, true);
        if(this.dev){
            rawFile.setRequestHeader('Cache-Control', 'no-cache');
        }
        if(headers) {
            for (var i = 0; i<headers.length; i++) {
                rawFile.setRequestHeader(headers[i].name,headers[i].value);
            }
        }

        rawFile.onreadystatechange = function ()
        {
            if(rawFile.readyState === 4)
            {
                if(rawFile.status === 200 || rawFile.status == 0)
                {
                        d.resolve(this);
                }
            }
        }
        rawFile.send(params);

    return d;
}

TaysController.prototype.setupListener=function(element,action,eventname){
    thus=this;
    element[eventname]=function (){
        var func_name=action.substring(0,action.indexOf("("));
        var func_args=action.substring(action.indexOf("("));
            func_args=func_args.replace("(","");
            func_args=func_args.replace(")","");
            func_args=func_args.split(",");
            console.log(element);
            thus.event_element=element;
            thus[func_name].apply(thus,func_args);
    }
}

TaysController.prototype.bindControllerListener=function(element,action){
    thus=this;
    element.onclick=function (){
        thus.goto(action);

    }
}

TaysController.prototype.setupChangeListeners=function(element){
    if(element){
     var allElements = element.getElementsByClassName('tays-onchange');
    }else{
     var allElements = document.getElementsByClassName('tays-onchange');
    }
  for (var i = 0, n = allElements.length; i < n; i++) {
        this.setupListener(allElements[i],allElements[i].getAttribute("tays-onchange"),"onchange");
  }

}

//setup click listeners on new elements of the whole document
TaysController.prototype.setupClickListeners=function(element){
    if(element){
     var allElements = element.getElementsByClassName('tays-click');
    }else{
     var allElements = document.getElementsByClassName('tays-click');
    }
  for (var i = 0, n = allElements.length; i < n; i++) {
        this.setupListener(allElements[i],allElements[i].getAttribute("tays-click"),"onclick");
  }

}

TaysController.prototype.setupControllerListeners=function(){
 var allElements = document.getElementsByClassName('tays-controller');
  for (var i = 0, n = allElements.length; i < n; i++) {
        this.bindControllerListener(allElements[i],allElements[i].getAttribute("tays-controller"));
  }
}

TaysController.prototype.setUpListeners=function(){
    //on-click listener
    this.setupClickListeners();
    this.setupChangeListeners();
    this.setupControllerListeners();
}
TaysController.prototype.loadControllerView=function(html,controller){
    for (var c_name in controllers) {
            if(controllers[c_name].app_container==this.app_container){
                controllers[c_name].style.display="none";
            }
    }
 
    if(!controllers[controller]) {
    var view = document.createElement("tays-controller-view");
        view.innerHTML = html;
        view.view_state="cached";
        view.style.display="block";
        view.controllercontroller;
        controllers[controller]=view;
        controllers[controller].app_container=this.app_container;
        controllers[controller].view_states="cached";
        this.app_container.appendChild(view);
    }else{
        controllers[controller].style.display="block";
    }
}

TaysController.prototype.renderView=function(controller){
   var d = new Deferred();
  var that=this;
  this.read_file("views/"+controller+".html").done(function(response){

    //after drawing html we add js specific to the controller
      that.loadControllerView(response.responseText,controller);
      d.resolve(that); 

  });
    return d;
}

//so each controller/view will maintain it's state
//it will reloald the html, but the 
TaysController.prototype.gotostate=function(controller,state){

}

TaysController.prototype.goto=function(controller,passed_vars){

    if(controllers[controller]) {
        this.loadControllerView(null,controller)
        return;
    }
    
    if(!passed_vars){ passed_vars={}; }
    var controllerstring="TaysController"+controller;
    //first load js
    //this.loadViewJS(controller).done(function(){
        var controller=new window[controllerstring]();
        //debugger;
        //we will need to reference some controllers globally
        var global_name=controllerstring+"GlobalInstance";
        window[global_name] = controller;

        controller.loadViewCss();
        controller.renderView(controller.view).done(function(){
            controller.loadPassedVars(passed_vars);
            controller.setUpListeners();
            controller.dataBind();
            controller.doneLoadingEvent();
        });
  //});
}

TaysController.prototype.loadPassedVars=function(passed_vars){
    this.passed_vars=passed_vars;
}
TaysController.prototype.doneLoadingEvent=function(){
return;
}


/*
TaysController.prototype.loadViewJS=function(controller){
    var that=this;
    var d = new Deferred();
    var jsHolder=document.getElementById("controller_js_holder");
        jsHolder.innerHTML='';
    var script_src = document.createElement("script");
        script_src.type = "text/javascript"; 
        script_src.src="js/"+controller+".js";
        script_src.onload=function(){
              d.resolve(that); 
        }
        jsHolder.appendChild(script_src);

    return d;
}
*/
TaysController.prototype.loadViewCss=function(){
    if(this.css){
        document.getElementById("view_css_"+this.app_container.getAttribute("id")).href="css/"+this.css;
    }
}

/*
TaysController.prototype.bindDataUpdateCrontroller=function(element,event){
    this.vars[element.getAttribute("tays-var")]=element.value;
}
*/


TaysController.prototype.bindDataUpdateDom=function(element,var_name){
   if(element.tagName =="INPUT" || element.tagName =="TEXTAREA"){
            element.value=this.vars.get(var_name);
    }else{
            element.innerHTML=this.vars.get(var_name);
    }
}

TaysController.prototype.bindDataListenerInit=function(element,var_name){
    var thus=this;
    //update dom with initial
    this.bindDataUpdateDom(element,var_name);
    //if its input bind listern for updating controller when changed
     if(element.tagName =="INPUT" || element.tagName =="TEXTAREA"){
         element.addEventListener("change",function(){
            //thus.bindDataUpdateCrontroller(element,event);
            thus.vars.set(element.getAttribute("tays-var"),element.value);
      });
    }
}

TaysController.prototype.dataBind=function(){
  var allElements = document.getElementsByClassName('tays-var');
  for (var i = 0, n = allElements.length; i < n; i++) {
        this.bindDataListenerInit(allElements[i],allElements[i].getAttribute("tays-var"));
  }
    for(var key in this.vars){
        this.vars.set(key,this.vars[key]);
    }


    
}

window.onload=function(){
    new TaysController().goto("index");
    new TaysController().goto("leftnavbar");
}


