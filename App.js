import React, {useEffect, useState} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Speech from "expo-speech";
import {SafeAreaView,View,Text,TextInput,TouchableOpacity,ScrollView,StyleSheet,StatusBar,KeyboardAvoidingView,Keyboard,Platform,Alert,ActivityIndicator,Share} from "react-native";

const STORAGE_KEY = "zhixue_ai_local_v1";
const C={bg:"#FFFFFF",panel:"#FFFFFF",panel2:"#F6F7F9",cyan:"#268BEA",blue:"#397BFF",purple:"#8B72D9",text:"#202124",muted:"#777777",green:"#259B70",line:"#E8E8E8"};
const subjects=[["数学","∑"],["语文","文"],["英语","A"],["物理","⚛"],["化学","⚗"],["生物","♧"],["历史","史"],["地理","地"]];
const grades=["小学一年级","小学二年级","小学三年级","小学四年级","小学五年级","小学六年级","初中一年级","初中二年级","初中三年级","高中一年级","高中二年级","高中三年级"];
const initial="你好！我是小蜜 AI 老师。告诉我你正在学习的知识点，或者把题目发给我文字，我会带你一步步理解。";
const todayKey=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;};
const defaultTasks=[{id:"t1",title:"复习今天课堂上的一个知识点",done:false},{id:"t2",title:"完成 10 分钟自主练习",done:false},{id:"t3",title:"整理一道易错题",done:false}];
const isShortText=(v,max=5000)=>typeof v==="string"&&v.length<=max;
function validateBackup(d){
 if(!d||typeof d!=="object"||Array.isArray(d)||d.version!==1)throw new Error("不支持的备份版本");
 const validRecord=r=>r&&typeof r==="object"&&isShortText(r.id,100)&&isShortText(r.subject,30)&&isShortText(r.question,5000)&&isShortText(r.answer,12000)&&isShortText(r.createdAt,50)&&!Number.isNaN(Date.parse(r.createdAt));
 if(!Array.isArray(d.records)||d.records.length>100||!d.records.every(validRecord))throw new Error("学习记录格式不正确");
 if(!Array.isArray(d.wrongs)||d.wrongs.length>100||!d.wrongs.every(validRecord))throw new Error("错题本格式不正确");
 if(!Array.isArray(d.saved)||d.saved.length>100||!d.saved.every(v=>isShortText(v,12000)))throw new Error("收藏数据格式不正确");
 if(!Array.isArray(d.checkins)||d.checkins.length>5000||!d.checkins.every(v=>typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v)))throw new Error("打卡数据格式不正确");
 if(!Array.isArray(d.tasks)||d.tasks.length>30||!d.tasks.every(t=>t&&isShortText(t.id,100)&&isShortText(t.title,120)&&typeof t.done==="boolean"))throw new Error("学习任务格式不正确");
 if(!isShortText(d.student,40)||!grades.includes(d.grade)||!Number.isSafeInteger(d.count)||d.count<0||!Number.isSafeInteger(d.minutes)||d.minutes<0)throw new Error("个人资料或统计数据格式不正确");
 return d;
}
function Button({title,onPress,outline=false,disabled=false}){return <TouchableOpacity disabled={disabled} onPress={onPress} style={[s.button,outline&&s.outline,disabled&&{opacity:.5}]}><Text style={[s.buttonText,outline&&{color:C.cyan}]}>{title}</Text></TouchableOpacity>}
function Header({title,subtitle}){return <View style={{marginBottom:18}}><Text style={s.kicker}>小蜜 AI · 智能学习空间</Text><Text style={s.h1}>{title}</Text>{!!subtitle&&<Text style={s.muted}>{subtitle}</Text>}</View>}
function Card({children,style}){return <View style={[s.card,style]}>{children}</View>}
function localTutor(q,subject,grade){
 const tips={
  "数学":"先写出已知条件和所求量，再判断适用的公式/定理。计算时保留关键步骤，最后代回检查。",
  "语文":"先圈画题干关键词，再结合上下文定位依据。回答时尽量采用“观点 + 文本证据 + 分析”的结构。",
  "英语":"先判断句子时态、主谓关系和关键词。遇到生词先看上下文，再检查词性、语序和固定搭配。",
  "物理":"先画出情境图，列出已知量和单位，再选择规律或公式。代入前统一单位，并检查结果是否合理。",
  "化学":"先辨认物质、反应条件和现象，再写反应前后各物质。配平方程式时检查原子种类与数目守恒。",
  "生物":"先明确结构、功能和发生条件，再按过程顺序整理因果关系。注意区分概念相近但作用不同的名词。",
  "历史":"先确定时间、地点、人物和背景，再从原因、经过、结果与影响四个角度组织答案。",
  "地理":"先定位区域，读取图例、方向、比例尺和数据，再结合自然与人文因素解释现象。"
 };
 return `【${subject} · ${grade}｜离线学习助手】\n\n你提出的问题：${q}\n\n一、先拆解问题\n把题目中的关键词、已知条件和最终要求分别写出来，确认自己究竟要解释概念、求出结果，还是分析原因。\n\n二、建议的思考方法\n${tips[subject]||"先明确概念和条件，再按逻辑顺序分析，并用题目中的信息验证结论。"}\n\n三、自己检查\n1. 我用到的概念或公式是什么？\n2. 每一步是否能由已知条件推出？\n3. 结论是否回答了题目？\n\n四、试着继续练习\n请把题目中的一个条件换掉，预测答案会怎样变化；也可以把你的解题步骤发来，我可以继续帮你检查思路。\n\n说明：当前是免费离线演示模式，不会调用 OpenAI API，也不会产生 API 费用。它提供学习方法提示，不等同于针对具体题目的完整 AI 解答。`;
}
export default function App(){
 const [tab,setTab]=useState("home"),[student,setStudent]=useState("同学"),[grade,setGrade]=useState("初中一年级"),[speechEnabled,setSpeechEnabled]=useState(true),[keyboardVisible,setKeyboardVisible]=useState(false);
 const [subject,setSubject]=useState("数学"),[input,setInput]=useState(""),[busy,setBusy]=useState(false);
 const [history,setHistory]=useState([{role:"assistant",content:initial}]),[saved,setSaved]=useState([]),[count,setCount]=useState(0),[minutes,setMinutes]=useState(0),[records,setRecords]=useState([]),[wrongs,setWrongs]=useState([]),[checkins,setCheckins]=useState([]),[tasks,setTasks]=useState(defaultTasks),[taskDate,setTaskDate]=useState(todayKey()),[search,setSearch]=useState(""),[backupInput,setBackupInput]=useState(""),[storageReady,setStorageReady]=useState(false);
 useEffect(()=>{const show=Keyboard.addListener("keyboardDidShow",()=>setKeyboardVisible(true));const hide=Keyboard.addListener("keyboardDidHide",()=>setKeyboardVisible(false));return()=>{show.remove();hide.remove();};},[]);
 useEffect(()=>{(async()=>{try{const raw=await AsyncStorage.getItem(STORAGE_KEY);if(raw){const d=JSON.parse(raw);if(d.student)setStudent(d.student);if(d.grade)setGrade(d.grade);if(Array.isArray(d.saved))setSaved(d.saved);if(Array.isArray(d.records))setRecords(d.records);if(Array.isArray(d.wrongs))setWrongs(d.wrongs);if(Array.isArray(d.checkins))setCheckins(d.checkins);if(d.taskDate===todayKey()&&Array.isArray(d.tasks))setTasks(d.tasks);else{setTasks(defaultTasks);setTaskDate(todayKey());}if(Number.isFinite(d.count))setCount(d.count);if(Number.isFinite(d.minutes))setMinutes(d.minutes);}}catch(e){console.warn("Local data restore failed",e);}finally{setStorageReady(true);}})();},[]);
 useEffect(()=>{if(!storageReady)return;AsyncStorage.setItem(STORAGE_KEY,JSON.stringify({student,grade,saved,count,minutes,records,wrongs,checkins,tasks,taskDate})).catch(e=>console.warn("Local data save failed",e));},[storageReady,student,grade,saved,count,minutes,records,wrongs,checkins,tasks,taskDate]);

 function clearLearningData(){Alert.alert("清空学习数据？","将删除本机保存的学习记录、收藏和统计，昵称与年级会保留。此操作无法撤销。",[{text:"取消",style:"cancel"},{text:"清空",style:"destructive",onPress:()=>{setRecords([]);setSaved([]);setWrongs([]);setCheckins([]);setTasks(defaultTasks);setCount(0);setMinutes(0);}}]);}
 async function saveProfile(){
  try{await AsyncStorage.setItem(STORAGE_KEY,JSON.stringify({student,grade,saved,count,minutes,records,wrongs,checkins,tasks,taskDate}));Alert.alert("保存成功","昵称和年级已保存在本机，不需要服务器或 API 费用。");}catch(e){Alert.alert("保存失败","本机存储暂时不可用，请稍后重试。");}
 }
 function toggleCheckin(){const k=todayKey();setCheckins(v=>v.includes(k)?v.filter(x=>x!==k):[...v,k]);}
 function toggleTask(id){setTasks(v=>v.map(t=>t.id===id?{...t,done:!t.done}:t));}
 function addWrong(r){setWrongs(v=>v.some(x=>x.id===r.id)?v:[r,...v]);Alert.alert("已加入错题本","这道题已保存到本机错题本。");}
 function removeRecord(id){Alert.alert("删除这条记录？","删除后无法恢复。",[{text:"取消",style:"cancel"},{text:"删除",style:"destructive",onPress:()=>{setRecords(v=>v.filter(x=>x.id!==id));setWrongs(v=>v.filter(x=>x.id!==id));}}]);}
 function removeFavorite(index){setSaved(v=>v.filter((_,i)=>i!==index));}
 async function exportBackup(){try{const payload=JSON.stringify({version:1,exportedAt:new Date().toISOString(),student,grade,saved,count,minutes,records,wrongs,checkins,tasks,taskDate},null,2);await Share.share({title:"小蜜本地数据备份",message:payload});}catch(e){Alert.alert("备份失败","暂时无法打开系统分享菜单。");}}
 function importBackup(){try{if(backupInput.length>2_000_000)throw new Error("备份文件过大");const d=validateBackup(JSON.parse(backupInput));setRecords(d.records);setSaved(d.saved);setWrongs(d.wrongs);setCheckins(d.checkins);setTasks(d.tasks);setTaskDate(todayKey());setStudent(d.student);setGrade(d.grade);setCount(d.count);setMinutes(d.minutes);setBackupInput("");Alert.alert("恢复成功","已验证备份格式，并将数据恢复到本机。");}catch(e){Alert.alert("无法恢复",e.message||"请粘贴由小蜜导出的完整 JSON 备份内容。");}}

 async function send(){
  const q=input.trim();
  if(!q||busy)return;

  setInput("");
  setBusy(true);

  try{
    const messages=[
  ...history.slice(-10).map(m=>({
    role:m.role,
    content:m.content
  })),
  {
    role:"user",
    content:`请你作为小蜜 AI，一位耐心、专业的中文学习老师，为学生提供循序渐进的辅导。学生年级：${grade}。当前学科：${subject}。请使用简体中文，讲解清楚，帮助学生理解知识，不要只给答案。\n\n学生问题：${q}`
  }
];

    const response=await fetch(
      "https://xiaomi-ai.jeffrey760719.workers.dev",
      {
        method:"POST",
        headers:{
          "Content-Type":"application/json"
        },
        body:JSON.stringify({messages})
      }
    );

    const data=await response.json();

    if(!response.ok){
      throw new Error(data.detail||data.error||"AI 服务暂时不可用");
    }

    if(typeof data.reply!=="string"||!data.reply.trim()){
      throw new Error("AI 返回内容为空，请稍后重试");
    }

    const answer=data.reply.trim();
if(speechEnabled){
  Speech.stop();
  Speech.speak(answer, {
    language: "zh-CN",
    rate: 0.95,
    pitch: 1.0
  });
}
    setHistory(h=>[
      ...h,
      {role:"user",content:q},
      {role:"assistant",content:answer}
    ]);

    setRecords(r=>[
      {
        id:String(Date.now()),
        subject,
        question:q,
        answer,
        createdAt:new Date().toISOString()
      },
      ...r
    ].slice(0,100));

    setCount(v=>v+1);
    setMinutes(v=>v+3);

  }catch(e){
    setInput(q);
    Alert.alert(
      "小蜜 AI 暂时无法回答",
      e.message||"请检查网络连接后重试"
    );
  }finally{
    setBusy(false);
  }
}

 const Home=()=> <View style={[s.homeScreen,keyboardVisible&&{justifyContent:"flex-end",paddingTop:0,paddingBottom:6}]}>
  {!keyboardVisible&&<View style={{flex:1,alignItems:"center",justifyContent:"center",paddingBottom:28}}>
   <View style={s.homeMark}><Text style={{color:"#FFFFFF",fontSize:30,fontWeight:"900"}}>蜜</Text></View>
   <Text style={s.homeBrand}>小蜜</Text>
   <Text style={s.homeGreeting}>你好！今天想学习什么？</Text>
  </View>}
  <View style={{flexShrink:0}}>
   {!keyboardVisible&&<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingBottom:12}}>
    {[["✦","学习助手","tutor"],["▤","学习记录","data"],["☆","错题收藏","data"],["○","个人中心","profile"]].map(([ic,label,target])=><TouchableOpacity key={label} style={s.homeShortcut} onPress={()=>setTab(target)}><Text style={s.homeShortcutIcon}>{ic}</Text><Text style={s.homeShortcutText}>{label}</Text></TouchableOpacity>)}
   </ScrollView>}
   <View style={s.homeComposer}>
    <TouchableOpacity onPress={()=>Alert.alert("语音输入","目前支持回答后语音播报；语音输入功能还未加入。")} style={s.homeTool}><Text style={s.homeToolIcon}>◖))</Text></TouchableOpacity>
    <TextInput value={input} onChangeText={setInput} placeholder="发消息或输入学习问题…" placeholderTextColor="#999999" multiline style={s.homeInput}/>
    <TouchableOpacity onPress={()=>Alert.alert("图片功能","图片提问功能还未加入。")} style={s.homeTool}><Text style={s.homeToolIcon}>▧</Text></TouchableOpacity>
    <TouchableOpacity onPress={()=>Alert.alert("更多功能","更多功能正在开发中。")} style={s.homeTool}><Text style={s.homeToolIcon}>＋</Text></TouchableOpacity>
    <TouchableOpacity onPress={()=>setTab("tutor")} style={s.homeSend}><Text style={{color:"#FFFFFF",fontSize:19,fontWeight:"900"}}>↑</Text></TouchableOpacity>
   </View>
   {!keyboardVisible&&<Text style={s.homeDisclaimer}>内容由 AI 生成，请注意核实</Text>}
  </View>
 </View>;
 const Tutor=()=> <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==="ios"?"padding":undefined}><View style={s.content}><Header title="学习助手" subtitle="先选学科，再输入问题；AI智能辅导模式帮助你理解知识、分析问题并掌握解题方法。"/>
  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{maxHeight:44,marginBottom:12}}>{subjects.map(([n])=><TouchableOpacity key={n} onPress={()=>setSubject(n)} style={[s.chip,subject===n&&s.chipOn]}><Text style={{color:subject===n?C.cyan:C.muted,fontWeight:"700"}}>{n}</Text></TouchableOpacity>)}</ScrollView>
  <Text style={[s.muted,{marginBottom:10}]}>当前学段：{grade}</Text>
  <ScrollView style={{flex:1}} contentContainerStyle={{paddingBottom:10}}>{history.map((m,i)=><View key={i} style={[s.bubble,m.role==="user"?s.userBubble:s.aiBubble]}><Text style={s.bubbleLabel}>{m.role==="user"?"你":"✦ 小蜜学习助手"}</Text><Text style={s.bubbleText}>{m.content}</Text>{m.role==="assistant"&&i>0&&<TouchableOpacity onPress={()=>setSaved(v=>v.includes(m.content)?v:[...v,m.content])}><Text style={s.link}>☆ 收藏这次讲解</Text></TouchableOpacity>}</View>)}{busy&&<ActivityIndicator color={C.cyan} style={{margin:12}}/>}</ScrollView>
  <View style={s.composer}><TextInput value={input} onChangeText={setInput} placeholder="输入问题，例如：为什么负负得正？" placeholderTextColor={C.muted} multiline style={s.input}/><TouchableOpacity onPress={send} style={s.send}><Text style={{color:C.bg,fontWeight:"900",fontSize:18}}>↑</Text></TouchableOpacity></View>
  <Text style={[s.muted,{fontSize:10,marginTop:6}]}>AI回答仅供学习参考，重要知识点请结合课本核对。不要输入真实姓名、住址或其他敏感个人信息。</Text>
 </View></KeyboardAvoidingView>;
 const Data=()=> <ScrollView contentContainerStyle={s.content}><Header title="学习数据" subtitle="搜索学习记录、整理错题与收藏，管理自己的学习轨迹。"/><View style={s.row}><Card style={s.stat}><Text style={s.number}>{count}</Text><Text style={s.muted}>提问次数</Text></Card><Card style={s.stat}><Text style={s.number}>{minutes}</Text><Text style={s.muted}>学习分钟</Text></Card><Card style={s.stat}><Text style={s.number}>{checkins.length}</Text><Text style={s.muted}>累计打卡</Text></Card></View><Card><Text style={s.cardTitle}>学习活动</Text><View style={s.track}><View style={[s.fill,{width:`${Math.min(100,count*10)}%`}]}/></View><Text style={s.muted}>本地演示进度：{Math.min(100,count*10)}%</Text></Card><Text style={s.section}>学习记录（{records.length}）</Text><TextInput value={search} onChangeText={setSearch} placeholder="搜索学科或题目关键词" placeholderTextColor={C.muted} style={s.field}/>{records.filter(r=>(r.question+" "+r.subject).toLowerCase().includes(search.trim().toLowerCase())).length===0?<Card><Text style={s.muted}>没有匹配记录。向学习助手提问后会自动保存。</Text></Card>:records.filter(r=>(r.question+" "+r.subject).toLowerCase().includes(search.trim().toLowerCase())).map(r=><Card key={r.id}><Text style={s.cardTitle}>{r.subject} · {new Date(r.createdAt).toLocaleString()}</Text><Text style={s.muted}>问题：{r.question}</Text><View style={{flexDirection:"row",flexWrap:"wrap",marginTop:8}}><TouchableOpacity onPress={()=>addWrong(r)} style={s.smallAction}><Text style={s.link}>＋ 加入错题本</Text></TouchableOpacity><TouchableOpacity onPress={()=>removeRecord(r.id)} style={s.smallAction}><Text style={{color:"#FF9B9B",fontSize:12,fontWeight:"800"}}>删除记录</Text></TouchableOpacity></View></Card>)}<Text style={s.section}>错题本（{wrongs.length}）</Text>{wrongs.length===0?<Card><Text style={s.muted}>暂时没有错题。可以从学习记录中把需要复习的题目加入错题本。</Text></Card>:wrongs.map(r=><Card key={r.id}><Text style={s.cardTitle}>{r.subject} · 待复习</Text><Text style={s.muted}>题目：{r.question}</Text><Text style={[s.muted,{marginTop:8}]}>复习提示：重新写出已知条件、关键概念和解题步骤，再对照讲解检查。</Text><TouchableOpacity onPress={()=>setWrongs(v=>v.filter(x=>x.id!==r.id))}><Text style={{color:C.cyan,fontSize:12,fontWeight:"800",marginTop:10}}>移出错题本</Text></TouchableOpacity></Card>)}<Text style={s.section}>收藏的讲解（{saved.length}）</Text>{saved.length===0?<Card><Text style={s.muted}>还没有收藏。去学习助手页面收藏一条讲解吧。</Text></Card>:saved.map((v,i)=><Card key={i}><Text style={s.cardTitle}>收藏 {i+1}</Text><Text style={s.muted}>{v}</Text><TouchableOpacity onPress={()=>removeFavorite(i)}><Text style={{color:"#FF9B9B",fontSize:12,fontWeight:"800",marginTop:10}}>取消收藏</Text></TouchableOpacity></Card>)}<Button title="清空全部学习数据" outline onPress={clearLearningData}/></ScrollView>;
 const Profile=()=> <ScrollView contentContainerStyle={s.content}><Header title="个人中心" subtitle="设置学习资料与年级。"/><Card style={{alignItems:"center"}}><View style={s.avatar}><Text style={{fontSize:28,color:C.cyan}}>✦</Text></View><Text style={s.cardTitle}>{student}</Text><Text style={s.muted}>{grade}</Text></Card><Card><Text style={s.cardTitle}>学生资料</Text><Text style={s.label}>昵称</Text><TextInput value={student} onChangeText={setStudent} style={s.field} placeholderTextColor={C.muted}/><Text style={s.label}>年级</Text><View style={s.gradeWrap}>{grades.map(g=><TouchableOpacity key={g} onPress={()=>setGrade(g)} style={[s.chip,grade===g&&s.chipOn]}><Text style={{color:grade===g?C.cyan:C.muted,fontSize:11}}>{g}</Text></TouchableOpacity>)}</View><Button title="保存资料" onPress={saveProfile}/></Card><Card><Text style={s.cardTitle}>免费开发模式</Text><Text style={s.muted}>当前使用本机存储：昵称、年级、学习记录和收藏保存在这台设备上。AI辅导通过小蜜云端服务连接，模型服务是否收费以实际服务商规则为准。更换手机或卸载应用可能导致本地数据丢失。</Text><Text style={[s.muted,{marginTop:8,color:C.green}]}>● AI云端服务已配置 · 使用情况以实际服务为准</Text></Card><Card><Text style={s.cardTitle}>本地数据备份与恢复</Text><Text style={s.muted}>导出会通过手机系统分享菜单生成 JSON 文本备份。恢复时，将备份文件中的完整 JSON 内容粘贴到下方。建议定期备份并妥善保管。</Text><Button title="导出本地数据备份" onPress={exportBackup}/><TextInput value={backupInput} onChangeText={setBackupInput} placeholder="在此粘贴 JSON 备份内容" placeholderTextColor={C.muted} multiline style={[s.field,{minHeight:90,marginTop:12,textAlignVertical:"top"}]}/><Button title="恢复备份数据" outline onPress={()=>Alert.alert("确认恢复？","导入备份将覆盖对应的学习记录、收藏、错题和统计数据。",[{text:"取消",style:"cancel"},{text:"确认恢复",onPress:importBackup}])} disabled={!backupInput.trim()}/></Card></ScrollView>;
 const nav=[["home","⌂","首页"],["tutor","✦","问 AI"],["data","▤","学习数据"],["profile","○","我的"]];
 return <SafeAreaView style={s.safe}><StatusBar barStyle="dark-content" backgroundColor="#FFFFFF"/><View style={s.top}>
 {tab==="home"?<>
  <TouchableOpacity onPress={()=>setTab("profile")} style={s.topAction}><Text style={s.topActionText}>☰</Text></TouchableOpacity>
  <TouchableOpacity onPress={()=>{Speech.stop();setHistory([{role:"assistant",content:initial}]);setInput("");setTab("tutor");}} style={s.topAction}><Text style={s.topActionText}>＋</Text></TouchableOpacity>
  <View style={s.topPill}><Text style={s.topPillActive}>快速</Text><Text style={s.topPillMuted}>小蜜 AI</Text></View>
 </>:<><View style={s.logo}><Text style={{color:"#FFFFFF",fontWeight:"900"}}>蜜</Text></View><Text style={s.brand}>小蜜 <Text style={{color:C.cyan}}>AI</Text></Text><View style={{flex:1}}/></>}
 <TouchableOpacity onPress={()=>{if(speechEnabled){Speech.stop();setSpeechEnabled(false);}else{setSpeechEnabled(true);}}} accessibilityRole="button" accessibilityLabel={speechEnabled?"关闭语音播报":"开启语音播报"} style={{paddingHorizontal:12,paddingVertical:6}}><Text style={{fontSize:22,color:speechEnabled?"#268BEA":"#777777"}}>{speechEnabled?"🔊":"🔇"}</Text></TouchableOpacity>
 </View><View style={{flex:1}}>{tab==="home"?Platform.OS==="ios"?<KeyboardAvoidingView style={{flex:1}} behavior="padding" keyboardVerticalOffset={0}>{Home()}</KeyboardAvoidingView>:Home():tab==="tutor"?Tutor():tab==="data"?Data():Profile()}</View>{tab!=="home"&&<View style={s.nav}>{nav.map(([id,ic,label])=><TouchableOpacity key={id} onPress={()=>setTab(id)} style={s.navItem}><Text style={[s.navIcon,tab===id&&{color:C.cyan}]}>{ic}</Text><Text style={[s.navLabel,tab===id&&{color:C.cyan}]}>{label}</Text></TouchableOpacity>)}</View>}</SafeAreaView>;
}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:C.bg},top:{height:62,paddingHorizontal:16,flexDirection:"row",alignItems:"center",borderBottomWidth:1,borderColor:"#F1F1F1"},logo:{width:30,height:30,borderRadius:10,backgroundColor:C.cyan,alignItems:"center",justifyContent:"center"},brand:{color:C.text,fontSize:17,fontWeight:"900",marginLeft:9},demo:{color:C.green,fontSize:11},topAction:{width:42,height:42,alignItems:"center",justifyContent:"center"},topActionText:{fontSize:26,color:"#222222"},topPill:{flex:1,marginHorizontal:12,height:42,borderRadius:24,backgroundColor:"#F1F2F4",flexDirection:"row",alignItems:"center",justifyContent:"center",gap:16},topPillActive:{fontSize:15,color:"#222222",fontWeight:"900"},topPillMuted:{fontSize:15,color:"#777777"},homeScreen:{flex:1,backgroundColor:"#FFFFFF",paddingHorizontal:20,paddingTop:8,paddingBottom:10,justifyContent:"space-between"},homeMark:{width:76,height:76,borderRadius:25,backgroundColor:"#59BCEB",alignItems:"center",justifyContent:"center",transform:[{rotate:"-5deg"}]},homeBrand:{fontSize:30,color:"#222222",fontWeight:"700",marginTop:12},homeGreeting:{fontSize:15,color:"#888888",marginTop:14},homeShortcut:{height:52,paddingHorizontal:16,borderRadius:17,borderWidth:1,borderColor:"#E5E5E5",marginRight:9,flexDirection:"row",alignItems:"center",justifyContent:"center",backgroundColor:"#FFFFFF"},homeShortcutIcon:{fontSize:18,color:"#333333",marginRight:8},homeShortcutText:{fontSize:14,color:"#333333",fontWeight:"600"},homeComposer:{minHeight:64,borderRadius:28,borderWidth:1,borderColor:"#E5E5E5",paddingHorizontal:9,paddingVertical:7,flexDirection:"row",alignItems:"center",backgroundColor:"#FFFFFF",shadowColor:"#000000",shadowOpacity:0.06,shadowRadius:10,elevation:2},homeTool:{width:34,height:40,alignItems:"center",justifyContent:"center"},homeToolIcon:{fontSize:22,color:"#444444"},homeInput:{flex:1,minHeight:42,maxHeight:90,paddingHorizontal:7,paddingVertical:9,color:"#222222",fontSize:14},homeSend:{width:36,height:36,borderRadius:18,backgroundColor:"#268BEA",alignItems:"center",justifyContent:"center",marginLeft:3},homeDisclaimer:{fontSize:11,color:"#BBBBBB",textAlign:"center",marginTop:12},
 content:{padding:18,paddingBottom:28,flexGrow:1,backgroundColor:"#FFFFFF"},kicker:{color:C.cyan,fontSize:10,fontWeight:"900",letterSpacing:1.6,marginBottom:8},h1:{fontSize:27,fontWeight:"900",color:C.text,marginBottom:5},muted:{color:C.muted,fontSize:12,lineHeight:19},
 card:{backgroundColor:C.panel,borderColor:C.line,borderWidth:1,borderRadius:17,padding:15,marginBottom:12},hero:{backgroundColor:"#102D4B",borderColor:"#276184",padding:19},heroTag:{color:C.cyan,fontSize:10,fontWeight:"900",letterSpacing:1.2},heroTitle:{color:C.text,fontSize:23,fontWeight:"900",marginTop:12},heroSub:{color:"#B7CBE1",fontSize:13,marginTop:8,marginBottom:12,lineHeight:20},
 button:{backgroundColor:C.cyan,borderRadius:12,padding:13,alignItems:"center",marginTop:10},outline:{backgroundColor:"transparent",borderWidth:1,borderColor:C.cyan},buttonText:{color:"#061526",fontWeight:"900",fontSize:13},
 section:{fontSize:17,color:C.text,fontWeight:"900",marginTop:18,marginBottom:12},grid:{flexDirection:"row",flexWrap:"wrap",justifyContent:"space-between"},subject:{width:"23.5%",backgroundColor:C.panel,borderWidth:1,borderColor:C.line,borderRadius:14,paddingVertical:13,alignItems:"center",marginBottom:9},subjectIcon:{fontSize:23,marginBottom:7},subjectName:{color:C.text,fontWeight:"700",fontSize:12},
 row:{flexDirection:"row",gap:8},stat:{flex:1,alignItems:"center",paddingVertical:14},number:{color:C.cyan,fontSize:22,fontWeight:"900",marginBottom:4},cardTitle:{color:C.text,fontSize:14,fontWeight:"900",marginBottom:8},
 chip:{backgroundColor:C.panel,borderWidth:1,borderColor:C.line,paddingVertical:8,paddingHorizontal:11,borderRadius:18,marginRight:7,marginBottom:6},chipOn:{backgroundColor:"#123A52",borderColor:C.cyan},
 bubble:{padding:13,borderRadius:15,borderWidth:1,marginBottom:10},aiBubble:{backgroundColor:C.panel,borderColor:C.line,marginRight:15},userBubble:{backgroundColor:"#123B55",borderColor:"#28627D",marginLeft:25},bubbleLabel:{color:C.cyan,fontWeight:"900",fontSize:10,marginBottom:6},bubbleText:{color:C.text,fontSize:13,lineHeight:21},link:{color:C.cyan,fontSize:12,fontWeight:"800",marginTop:10},
 composer:{flexDirection:"row",alignItems:"flex-end",backgroundColor:C.panel,borderRadius:14,borderWidth:1,borderColor:C.line,padding:7},input:{flex:1,color:C.text,minHeight:42,maxHeight:100,paddingHorizontal:8,paddingTop:10,fontSize:13},send:{width:40,height:40,borderRadius:12,backgroundColor:C.cyan,alignItems:"center",justifyContent:"center",marginLeft:7},
 track:{height:8,backgroundColor:"#243B55",borderRadius:8,overflow:"hidden",marginVertical:12},fill:{height:8,backgroundColor:C.cyan},avatar:{width:64,height:64,borderRadius:22,backgroundColor:"#174B66",alignItems:"center",justifyContent:"center",marginBottom:12,borderWidth:1,borderColor:C.cyan},
 smallAction:{paddingVertical:5,paddingRight:18},label:{color:C.muted,fontSize:12,marginTop:10,marginBottom:6},field:{backgroundColor:"#091A2C",borderWidth:1,borderColor:C.line,borderRadius:10,padding:11,color:C.text},gradeWrap:{flexDirection:"row",flexWrap:"wrap",marginTop:3},nav:{height:64,backgroundColor:"#FFFFFF",borderTopWidth:1,borderColor:C.line,flexDirection:"row",justifyContent:"space-around",alignItems:"center"},navItem:{alignItems:"center",minWidth:60},navIcon:{color:C.muted,fontSize:20},navLabel:{color:C.muted,fontSize:10,marginTop:3}
});
