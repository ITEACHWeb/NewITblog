/**
 * plugin.js
 *
 *
 * License: http://www.siteeditor.org/license
 * Contributing: http://www.siteeditor.org/contributing
 */

/*global siteEditor:true */
siteEditor.PluginManager.add('styleEditor', function(siteEditor) {

  var api = siteEditor.sedAppClass.editor , $ = siteEditor.dom.Sizzle , siteEditorCss =  new sedApp.css;
  api.iframeDocumentNodes = api.iframeDocumentNodes || [];
  //previewer = siteEditor.siteEditorControls;
  ////api.log( siteEditor );
  ////api.log( sedApp.editor === api );
  ////api.log( siteEditor.dom.Sizzle === jQuery );
  ////api.log( sedApp );
  ////api.log( jQuery );
  ////api.log( siteEditor );

  api.StyleEditor = api.Class.extend({

        initialize: function( options , params ){

            this.treeId = 'document-navigator';

            this.tree = $('#' + this.treeId);

            this.currentModuleId = -1;

            this.domChanged = true;

            this.navigatorMode = "all";  //module || all || global-styles

            this.designPanelMode = "navigator";  //navigator || edit

            this.toolbarMode = "disable";  // disable || enable

            this.loadedCodeEditor = false;

            this.currentSelector = "";  //body

            this.currentSelectorbuilder = {
                "tag"           : "" ,
                "id"            : "" ,
                "module-parent" : "" ,
                "classes"       : [] ,
                "pseudo"        : [] ,
                "others"        : []
            };

            this.currentElementInfo;

            this.zTreeLoaded = false;

            this.ready();
        },

        ready : function() {

            this.designPanelInit();

            this.highlightElement($("#document-navigator"));

            this.highlightElement($("#current-module-navigator"));

            this.styleElementOptionsEdit();

            this.cssCodeEditor();

            this.navBtnsInit();

            this.styleEditorToolbarMod(1);

            this.afterSelectNode();

            this.selectorInit();

        },

        getNodeId : function( el ){
            var tId = $(el).attr("id") ,
                tId = tId.replace("_a" , "");
                                   //alert( tId );
            var treeObj = $.fn.zTree.getZTreeObj( this.treeId );
            var node = treeObj.getNodeByTId( tId );
            ////api.log(node);
            return node.id;
        },

        loadModuleNavigator : function( loadedCallback ){
            var self = this;

            if(!this.currentModuleId || this.currentModuleId == -1)
                return ;

            var $thisNode;
            $.each( api.iframeDocumentNodes , function( index , node){
                if(node.id == self.currentModuleId){
                    $thisNode = node;
                    return false;
                }
            });

            var treeChildren = this.getNodeTreeChildren( this.currentModuleId );
            treeChildren.unshift( $thisNode  );
                               //alert( this.currentModuleId );
            this.tree.hide();
            this.treeId = 'current-module-navigator';
            this.tree = $('#' + this.treeId);
            this.tree.show();

            var callback = function(){
                $(".navigator-loading").hide();
                self.zTreeRender( treeChildren );
                self.navigatorMode = "module";
                self.checkNavBtns();

                if(loadedCallback)
                    loadedCallback();
            };

            if(this.zTreeLoaded === false){
                this.zTreeInit( callback );
            }else{
                callback();
            }

        },

        getNodeTreeChildren : function( pId ){
            var nodes = api.iframeDocumentNodes , children = [] , self = this;
            $.each(nodes , function( index , node){
                if(node.pId == pId){
                    children.push( node );
                    var treeChildren = self.getNodeTreeChildren(node.id) || [];
                    if($.isArray( treeChildren ))
                        children = $.merge( children , treeChildren );
                }
            });
            return children;
        },

        loadNavigator : function(loadedCallback){
            var self = this;

            var callback = function(){
                $(".navigator-loading").hide();
                self.tree.hide();
                self.treeId = 'document-navigator';
                self.tree = $('#' + self.treeId);
                self.tree.show();

                if(self.domChanged === true){ //alert("ckodfjv");
                    var zNodes = api.iframeDocumentNodes;
                    self.zTreeRender( zNodes );
                    self.domChanged = false;
                }

                self.navigatorMode = "all";
                self.checkNavBtns();

                if(loadedCallback)
                    loadedCallback();

            };

            if(self.zTreeLoaded === false){
                self.zTreeInit( callback );
            }else{
                callback();
            }
        },

        checkNavBtns : function(  ){
            var mBtn = $('#show-current-module-elements') ,
                aBtn = $('#show-all-elements');    //alert( this.navigatorMode );
            if( this.navigatorMode == "module" ){
                mBtn.hide();
                aBtn.show();
            }else if( ( this.navigatorMode == "all" && (!this.currentModuleId || this.currentModuleId == -1 ) ) || this.navigatorMode == "global-styles"  ){
                mBtn.hide();
                aBtn.hide();
            }else if( this.currentModuleId && this.currentModuleId != -1 ){
                mBtn.show();
                aBtn.hide();
            }
        },

        navBtnsInit : function( callback ){
            var mBtn = $('#show-current-module-elements') ,
                aBtn = $('#show-all-elements') , self = this;

            mBtn.click(function(){
                self.switchNavigator( "module" );
            });

            aBtn.click(function(){
                self.switchNavigator( "all" );
            });

        },

        switchNavigator : function( to ){
            var self = this;
            if(!to || ( to == "module" && ( !self.currentModuleId || self.currentModuleId == -1 )  ) )
                return ;

            var zTree = $.fn.zTree.getZTreeObj( self.treeId )
            var nodes = zTree.getSelectedNodes();

            switch ( to ) {
                case "all":
                    self.loadNavigator();
                break;
                case "module":
                    self.loadModuleNavigator();
                break;
            }

            self.navigatorMode = to;
            self.checkNavBtns();

			zTree = $.fn.zTree.getZTreeObj( self.treeId );
                            ////api.log(nodes);
            if(nodes.length == 0)
                return ;

            var node = zTree.getNodeByParam("id", nodes[0].id );

            zTree.expandNode( node, true, null, null);
            zTree.selectNode( node );
            api.Events.trigger( "selectNodeNavigator" , node);
            $(".ztree-scrollbar").mCustomScrollbar( "scrollTo","#" + node.tId );
            //$(".ztree-scrollbar").mCustomScrollbar( "scrollTo",[0 , 100] );
        },

        designPanelInit : function( ){
            var self = this;

            $( "#dialog-options-navigator" ).dialog({
                width :  295,
                modal : false ,
                autoOpen : false ,
                height : $("#sed-site-preview").innerHeight() ,
                position : { my: "right-20", at: "right" , of: "#sed-site-preview" }
            });

            $(".ztree-scrollbar").mCustomScrollbar({
                axis:"yx" ,// vertical and horizontal scrollbar
                autoHideScrollbar : true,
                advanced:{
                    autoExpandHorizontalScroll:"x",
                    updateOnBrowserResize:true, /*update scrollbars on browser resize (for layouts based on percentages): boolean*/
                    updateOnContentResize:true,
                },
                alwaysShowScrollbar : 0 ,
                live : true
            });

        },

        zTreeInit : function( callback ){
            var self = this;

            yepnope({
              load: [LIBBASE.url + "ztree/js/jquery.ztree.core-3.5.js", LIBBASE.url + "ztree/css/zTreeStyle.css" ],
              complete: function () {
                  if(callback)
                    callback();

                  self.zTreeLoaded = true;
              }
            });
        },

        zTreeRender : function( zNodes ){
            var setting = {
       			data: {
      				key: {
      					title:"t"
      				},
      				simpleData: {
      					enable: true
      				}
      			},

      			view: {
      				nameIsHTML: true,
                    //showLine: false ,
                    showIcon: false ,
                    selectedMulti: false
                    //txtSelectedEnable: true
      			},

            	callback: {
            		onClick: function(event, treeId, treeNode) {
                        api.previewer.send( 'findCurrentModule', treeNode.id );
                    }
            	}
            };


            $.fn.zTree.init( this.tree , setting, zNodes );
        },

        highlightElement : function( tree ){
            var self = this;
            tree.find("a[treenode_a]").livequery(function(){
                $(this).on("mouseover" , function(){
                    var id = self.getNodeId(this);
                    api.previewer.send( 'addHighlightToElement', id );
                });

                $(this).on("mouseout" , function(){
                    var id = self.getNodeId(this);
                    api.previewer.send( 'removeHighlightElement', id );
                });

                $(this).find(">span:last-child").addClass("treenode-span");

            });
        },

        styleElementOptionsEdit : function(){
            var self = this;
            if(Modernizr.csstransitions){

              $(".edit-style-element-action").livequery(function(){
                $(this).click(function(e){
                    $("#dialog-page-box-navigator").addClass("navigator-hide");
                    $("#dialog-page-box-options").addClass("options-show"); 
                  $( "#dialog-options-navigator" ).dialog( "option" , "title", "Bake" );
                    $( ".ui-dialog" ).addClass("dialog-navigator");
                    $( ".ui-dialog-titlebar" ).addClass("dialog-titlebar-hide");
               /*   $("#dialog-options-navigator .ui-dialog-title").toggleClass("title-tree-hide");
                    $("#dialog-options-navigator .ui-dialog-title").toggleClass("title-mode-show");   */

                    var span = $(this).parent() , spanId = span.attr("id") ,
                        tId = spanId.replace("_span" , "") ,
                        treeObj = $.fn.zTree.getZTreeObj( self.treeId ),
                        node = treeObj.getNodeByTId( tId );


                    api.previewer.send( 'findDomElementInfo', node.id );
                });

              });

              $(".btn-back").livequery(function(){
                $(this).click(function(){
                  $("#dialog-page-box-navigator").removeClass("navigator-hide");
                  $("#dialog-page-box-options").removeClass("options-show");
         /*           $( ".ui-dialog-titlebar" ).removeClass("dialog-titlebar-hide");
                  $( "#dialog-options-navigator" ).dialog( "option" , "title", "Design Panel" );    */

                  self.resetCurrentSelector();

                });
              });

            }else{

                $(".edit-style-element-action").livequery(function(){
                    $(this).click(function(e){
                        $("#treeview").addClass("treeview-hide");
                        $(".mode-play-style").addClass("mode-play-style-show");
                        $(".mode-play-style").animate({left:'0'});
                        $( "#dialog-options-navigator" ).dialog( "option" , "title", "Dialog Title" );
                        $( ".ui-dialog-title" ).addClass("back-treeview");



                    });
                });

                $(".ui-dialog-title").click(function(){
                $("#treeview").removeClass("treeview-hide");
                $(".mode-play-style").removeClass("mode-play-style-show");
                $(".mode-play-style").animate({left:'300'});
                $( "#dialog-options-navigator" ).dialog( "option" , "title", "Transition" );

                });

            }

        },

        createDomElementInfo : function( elementInfo ){
            var classes = [];
            this.currentElementInfo = elementInfo;

            $("#current-element-classes").html('');

            if(elementInfo.attrs.class)
                classes = elementInfo.attrs.class.split(" ") || [];

            if($.isArray( classes ) && classes.length > 0 ){
                $.each( classes , function( index , className){
                   if(className){
                       var html = '<label for="" class="sed-bp-form-checkbox">';
                       html += '<input  type="checkbox" class="style-editor-selector-control sed-bp-input sed-bp-checkbox-input class-selector sted-selector" data-type="classes" value="' + className + '" name="class-' + className + '" />';
                       html += className + '</label>';
                       $(html).appendTo( $("#current-element-classes") );
                   }

                });
            }

            this.elementStyleEdit();

        },

        /*
        for Start Edit Style Element you should doing 3 steps :
        #1 : create default selector , it is usally #Current Element Id
        #2 : enable controls in toolbar
        #3 : update controls in toolbar
        */
        elementStyleEdit : function(){
            if(this.currentElementInfo.attrs.id){
                this.currentSelector = "#" + this.currentElementInfo.attrs.id;
                this.styleEditorToolbarMod( 0 );
                this.updateToolbarControls();
            }

            var editOptions = $("#dialog-page-box-options") ,
            visitedState = editOptions.find("[name='visited-state']").parent() ,
            focusState = editOptions.find("[name='focus-state']").parent() ,
            scopeThisModule = editOptions.find("[name='scope-this-module']").parent() ,
            scopeThisElement = editOptions.find("[name='scope-this-element']").parent() ,
            formPseudoElements = editOptions.find(".form-pseudo-elements") ,
            checkedState = editOptions.find("[name='checked-state']").parent();

            if(this.currentElementInfo.attrs.id){
                editOptions.find("[name='scope-this-element']").val( this.currentElementInfo.attrs.id );
                scopeThisElement.show();
            }else
                scopeThisElement.hide();


            if( !this.currentModuleId || this.currentModuleId == -1 )
                scopeThisModule.hide();
            else{
                editOptions.find("[name='scope-this-element']").val( this.currentModuleId );
                scopeThisModule.show();
            }

            editOptions.find("[name='scope-this-tag']").val( this.currentElementInfo.tag );

            if( this.currentElementInfo.tag != "a" )
                visitedState.hide();
            else
                visitedState.show();

            if( $.inArray(this.currentElementInfo.tag ,["select" , "textarea" , "input" , "button" , "a"] ) != -1 || typeof this.currentElementInfo.attrs.contenteditable != "undefined" )
                focusState.show();
            else
                focusState.hide();

            if( $.inArray(this.currentElementInfo.tag ,["select" , "textarea" , "input" , "button"] ) != -1 ){
                formPseudoElements.show();
                if(this.currentElementInfo.tag == "input" && $.inArray( this.currentElementInfo.attrs.type , ["checkbox" , "radio"] ) != -1 )
                    checkedState.show();
                else
                    checkedState.hide();
            }else{
                formPseudoElements.hide();
            }

        },

        /*
        selector are icludes several group : (only groups that support in style editor)
            #1 --- tags    : p , div , span , body , ....
            #2 --- classes : .test1 , .test2 , ....
            #3 --- ids     : #test-id1 , test-id2 , ....
            #4 --- state   : :hover , :active , :focus , :visited
            #5 --- after & before tags : :after , :before
            #6 --- form selectors : input:checked ,  input:disabled , input:enabled
            #7 --- first & last child : :first-child , :last-child
            #8 --- parents : div > p , div p , ....
            ### description :
            :link(normal) , :visited only for a tag ,
            :hover , :active for all element ,
            :focus selector is allowed on elements that accept keyboard events or other user inputs
            :checked for only checkbox elements && radio buttons
            :disabled , :enabled for only form elements inclue : input , select , textarea , button
            end description###
            ## selector rule :
              1.tags 2.ids 3.classes 4.state or after-before or form selectors or first & last

            end rule ##
        */
        createSelector : function( type , selector , action ){
           action = (!action) ? "add" : action;

            switch ( type ) {
              case "tag":
              case "id":
              case "module-parent":
                  if( action == "add" ){
                      this.currentSelectorbuilder[type] = selector;
                  }else if( action == "remove" ){
                      this.currentSelectorbuilder[type] = "";
                  }
              break;
              case "classes":
              case "pseudo":
                  if( action == "add" ){  ////api.log( this.currentSelectorbuilder[type] );
                      if($.inArray(selector , this.currentSelectorbuilder[type]) == -1)
                         this.currentSelectorbuilder[type].push(selector);
                  }else if( action == "remove" ){
                      var index = $.inArray(selector , this.currentSelectorbuilder[type]);
                      if(index != -1)
                         this.currentSelectorbuilder[type].splice(index , 1);
                  }
              break;
            }          ////api.log( this.currentSelectorbuilder );

            var selector = this.convertToSelector( this.currentSelectorbuilder );
            this.currentSelector = (selector) ? selector : "";
                     //alert( this.currentSelector );
            if(this.currentSelector){
                this.styleEditorToolbarMod( 0 );
                this.updateToolbarControls();
            }else{
                this.styleEditorToolbarMod( 1 );
            }
        },

        convertToSelector : function( selectorObj ){
            var selector = (selectorObj["module-parent"]) ? "#" + selectorObj["module-parent"] + " ":"";
            selector += selectorObj["tag"];
            selector += (selectorObj["id"]) ? "#" + selectorObj["id"] : "";


            $.each(selectorObj["classes"] , function(index , className){
                if(className)
                    selector += "." + className;
            });

            if(!selector)
                return;

            var selectorPseudo = selectorObj["pseudo"] , $i = 1;

            $.each(selectorPseudo , function(index , pseudo){
                if($i > 1)
                    selector = "," + selector + ":" + pseudo;
                else
                    selector += ":" + pseudo;

                $i++;
            });

            return selector;
        },

        resetCurrentSelector : function(){
            this.currentSelector = "";  //body

            this.currentSelectorbuilder = {
                "tag"           : "" ,
                "id"            : "" ,
                "module-parent" : "" ,
                "classes"       : [] ,
                "pseudo"        : [] ,
                "others"        : []
            };
        },

        selectorInit : function(){
            var self = this;
            $("#dialog-page-box-options .sted-selector").livequery(function(){
                $(this).change(function(){
                    var isChecked = $(this).is(':checked') , value = $(this).val() ,
                        type = $(this).data("type");

                    if(isChecked){
                        self.createSelector( type , value , "add" );
                    }else{
                        self.createSelector( type , value , "remove" );
                    }
                });
            });
        },

        cssCodeEditor : function(){
            var self = this;
            $( "#dialog-css-code-mirror" ).dialog({
                width :  700,
                modal : false ,
                autoOpen : false ,
                height : 500
            });

            $(".code-editor-action").livequery(function(){
                $(this).click(function(){
                    $( "#dialog-css-code-mirror" ).dialog('open');
                    if(self.loadedCodeEditor === false){
                        yepnope({
                          load: [
                              LIBBASE.url + "codemirror/lib/codemirror.min.css" ,
                              //LIBBASE.url + "codemirror/addon/hint/show-hint.css" ,
                              LIBBASE.url + "codemirror/lib/codemirror.min.js",
                              //LIBBASE.url + "codemirror/addon/hint/show-hint.js"  ,
                              //LIBBASE.url + "codemirror/addon/hint/css-hint.js" ,
                              LIBBASE.url + "codemirror/mode/css/css.min.js"
                           ],
                          complete: function () {
                              var cssEditor = CodeMirror.fromTextArea($("#css-code")[0], {
                                lineNumbers: true,
                                //extraKeys: {"Ctrl-Space": "autocomplete" , globalVars: true},
                                mode: {name: "css"}
                              });

                              self.loadedCodeEditor =  true;
                          }
                        });

                    }
                });
            });
        } ,

        styleEditorToolbarMod : function(disabled){
            /*$.each( api.settings.controls, function( id, data ) {
                var control = api.control.instance( id );
                if(data.category == 'style-editor')
                    control.controlMod(disabled);
            }); */
            var styleEditorTab = $("#style-editor-tab-content") ,
                containers = styleEditorTab.find(".sed-style-editor-element"),
                targetElement , tarElDisable;
                disabled = arguments.length == 0 ? 1 : disabled;

            this.toolbarMode = (disabled == 1) ? "disable": "enable";

            containers.each(function(index , element){

                targetElement = $(this).find(".sed-control-element");
                if(targetElement.length > 0){
                    if(disabled == 1)
                        targetElement.addClass("element-disabled");
                    else
                        targetElement.removeClass("element-disabled");
                }

                tarElDisable = $(this).find(">.sed-control-element-disable");
                if(tarElDisable.length == 0)
                    tarElDisable = $('<div class="sed-control-element-disable"></div>').appendTo($(this));

                if(disabled == 1)
                    tarElDisable.show();
                else
                    tarElDisable.hide();
            });
        },

        updateToolbarControls : function( ){
            var self = this;

            if(!this.currentSelector)
                return ;

            $.each( api.settings.controls, function( id, data ) {
                var control = api.control.instance( id );
                if(data.category == 'style-editor')
                    control.update( self.currentSelector );
            });

        },

        afterSelectNode : function(){
            var self = this;
            api.Events.bind( "selectNodeNavigator" , function( node ){
                //__notSupportedCssRulesForTags
                //__notSupportedCssRulesForSelectors like content for :after && :before selector
            });
        }


  });

  $( function() {
      api.settings = window._sedAppEditorSettings;
      api.l10n = window._sedAppEditorControlsL10n;

      // Check if we can run the customizer.
      if ( ! api.settings )
      	return;


      // Redirect to the fallback preview if any incompatibilities are found.
      if ( ! $.support.postMessage || (  api.settings.isCrossDomain ) )  //! $.support.cors &&
      	return window.location = api.settings.url.fallback;


        api.styleEditor = new api.StyleEditor({} , {
            preview : api.preview
        });


        api.previewer.bind( 'call_style_editor', function( targetElement ) {
            $("#style-editor a").tab('show');

            _StEdChangeState("on");


        });

        /*
        $('#website').hover(function(e){
            //e.stopPropagation();
            ( e.pageX , e.pageY )
        },function(e){
            //e.stopPropagation();


        });*/

        var _StEdChangeState = function( state ){

            $("#on-off-style-editor").data("value" , state );

            if(state == "off"){
                $("#on-off-style-editor").addClass("style-editor-off").removeClass("style-editor-on");
                $("#on-off-style-editor").val( api.I18n.style_editor_off );
            }else{
                $("#on-off-style-editor").addClass("style-editor-on").removeClass("style-editor-off");
                $("#on-off-style-editor").val( api.I18n.style_editor_on );
            }

            api.previewer.send( 'changeStateStyleEditor', state );

        };


        $('#style-editor a').on('shown.bs.tab', function (e) {
            $( "#dialog-options-navigator" ).dialog('open');
            $(".navigator-loading").show();
            api.previewer.send( 'afterShowStyleEditor');
        });

        $("#on-off-style-editor").on("click" , function(){

            var state = ($(this).data("value") == "off") ? "on" : "off";

            _StEdChangeState( state );

            if(state == "off"){
                $("#modules a").tab('show');
            }else{
                $("#style-editor a").tab('show');
            }

        });

        $("#myTab li a").on("click" , function(){

            if( $(this).parent().attr("id") == "style-editor" ){
                _StEdChangeState("on");
            }else{
                _StEdChangeState("off");
            }

        });


        api.previewer.bind( 'styleEditorElementsSelect', function( elements ) {    
            ////api.log( elements );
            $.each( api.settings.controls, function( id, data ) {
                var control = api.control.instance( id );
                if(data.category == 'style-editor')
                    control.update(targetElement);
            });


        });


        api.previewer.bind( 'styleEditorElementSelected', function( data ) {
            var id = data.id, pId = data.pId , moduleId = data.moduleId;

            if(!moduleId || moduleId == -1){
                api.styleEditor.currentModuleId = -1;
                api.styleEditor.loadNavigator();
            }else{
                if( api.styleEditor.navigatorMode == "module" ){
                    if( api.styleEditor.currentModuleId != moduleId  ){
                        api.styleEditor.currentModuleId = moduleId;
                        api.styleEditor.loadModuleNavigator();
                    }
                }else{
                    api.styleEditor.currentModuleId = moduleId;
                    api.styleEditor.loadNavigator();
                }
            }

			zTree = $.fn.zTree.getZTreeObj( api.styleEditor.treeId ),
            node = zTree.getNodeByParam("id", id );

            if(!node)
                return ;

            zTree.expandNode(node, true, null, null);
            zTree.selectNode(node);
            api.Events.trigger( "selectNodeNavigator" , node);
            $(".ztree-scrollbar").mCustomScrollbar( "scrollTo","#" + node.tId );
            //$(".ztree-scrollbar").mCustomScrollbar( "scrollTo",[0 , 100] );
        });

        api.previewer.bind( 'domElementInfo', function( elementInfo ) {

            api.styleEditor.createDomElementInfo( elementInfo );

        });


        api.previewer.bind( 'updateNavigator', function( data ) {
            api.iframeDocumentNodes = data.docNodes;
            api.styleEditor.domChanged = data.domChanged;
            api.styleEditor.currentModuleId = data.moduleId;

            var zTree , nodes ;
            if($.fn.zTree){
                zTree = $.fn.zTree.getZTreeObj( api.styleEditor.treeId );
                nodes = zTree.getSelectedNodes();
            }

            var loadedCallback = function(){
                var currentStyleId;

                if(data.currentStyleId != -1){
                    currentStyleId = data.currentStyleId;
                }else{
                    if( $.isArray(nodes) && nodes.length > 0 && api.styleEditor.zTreeLoaded === true ){
                        currentStyleId = nodes[0].id;
                    }else{
                        currentStyleId = data.defaultStyleId;
                    }
                }
                        ////api.log(currentStyleId);
                var zTree = $.fn.zTree.getZTreeObj( api.styleEditor.treeId );

                var node = zTree.getNodeByParam("id", currentStyleId );

                if(node){
                    zTree.expandNode( node, true, null, null);
                    zTree.selectNode( node );
                    api.Events.trigger( "selectNodeNavigator" , node);
                    $(".ztree-scrollbar").mCustomScrollbar( "scrollTo","#" + node.tId );
                    //$(".ztree-scrollbar").mCustomScrollbar( "scrollTo",[0 , 100] );
                }
            };


            switch ( api.styleEditor.navigatorMode ) {
                case "all":
                    if(api.styleEditor.domChanged === true)
                        api.styleEditor.loadNavigator( loadedCallback );
                    else{
                        $(".navigator-loading").hide();
                        loadedCallback();
                    }
                break;
                case "module":
                    if(api.styleEditor.domChanged === true)
                        api.styleEditor.loadModuleNavigator( loadedCallback );
                    else{
                        $(".navigator-loading").hide();
                        loadedCallback();
                    }
                break;
            }


        });

        api.previewer.bind( 'currentModuleStyleId', function( moduleId ) {

            api.styleEditor.currentModuleId = moduleId;
            api.styleEditor.checkNavBtns();
        });

        api.previewer.bind( 'closeDesignPanel', function( moduleId ) {
            $( "#dialog-options-navigator" ).dialog('close');
        });


  });

});