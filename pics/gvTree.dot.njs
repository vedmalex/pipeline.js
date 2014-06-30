digraph sample {
	rankdir=LR
<# var dItem;
for (var i = 0, len = context.length; i < len; i++) {
	dItem = context[i]; debugger;
#><#if(dItem.objInstance && !dItem.value){#>// object instance
	node [shape=Mrecord, fillcolor=beige, style=filled];<#}
 else if(dItem.objInstance && dItem.value){#>// value ref
	node [shape = Mrecord, fillcolor=lightskyblue, style=filled]; <#} 
 else {#>// type
	node [shape = record, fillcolor=orange, style=filled];<#}#>
	"#{dItem.value||((dItem.objInstance ? "instance of: ": "") + dItem.name||dItem.type)}" [label="<__proto__> #{dItem.value||((dItem.objInstance ? "instance of: ": "") + dItem.name||dItem.type)}|<#
for(var p in dItem.properties){
 var prop = dItem.properties[p];
 out+="<"#>#{p}> #{p} : #{prop.value||((prop.objInstance ? "instance of: ": "") + prop.name||prop.type)}|<#}#>" ];

// references
// в принципе по интересу можно сделать.... позже
//instance links
	"#{dItem.value||((dItem.objInstance ? "instance of: ": "") + dItem.name||dItem.type)}":__proto__ #{dItem.ref ? ('-> "' + dItem.ref + '":__proto__') : ''}
<#}#>
}