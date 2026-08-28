/**
 * Cursor's preview injects `data-cursor-ref` into the live DOM before React
 * hydrates. Next then reports a hydration mismatch (the red `nextjs-portal`
 * badge) even though the app HTML is correct. Strip that attr until hydration
 * finishes; disconnect afterwards so the inspector still works.
 */
export const INSPECTOR_ATTR_GUARD_SCRIPT = `(function(){var a="data-cursor-ref";var on=true;function strip(n){if(!n||n.nodeType!==1)return;if(n.hasAttribute&&n.hasAttribute(a))n.removeAttribute(a);var q=n.querySelectorAll&&n.querySelectorAll("["+a+"]");if(q)for(var i=0;i<q.length;i++)q[i].removeAttribute(a)}var obs=new MutationObserver(function(rs){if(!on)return;for(var i=0;i<rs.length;i++){var r=rs[i];if(r.type==="attributes"&&r.attributeName===a&&r.target.removeAttribute)r.target.removeAttribute(a);for(var j=0;j<r.addedNodes.length;j++)strip(r.addedNodes[j])}});function watch(){if(!document.documentElement)return;strip(document.documentElement);obs.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:[a]})}watch();window.addEventListener("load",function(){window.setTimeout(function(){on=false;obs.disconnect()},2000)})})();`;
