function fail(message,statusCode=400){const error=new Error(message);error.statusCode=statusCode;throw error;}
function yearId(value){if(!/^[1-9]\d*$/.test(String(value)) || Number(value)>2147483647)fail('Invalid academic year ID.');return Number(value);}
function date(value,label){
 if(typeof value!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value<'1900-01-01' || value>'9998-12-31')fail(`${label} must be a valid date between 1900 and 9998.`);
 const parsed=new Date(value+'T00:00:00Z');
 if(!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0,10)!==value)fail(`${label} is not a valid date.`);
 return value;
}
function normalize(body){
 const opening=date(body?.openingDate,'Opening date'),closing=date(body?.closingDate,'Closing date');
 if(closing<opening)fail('Closing date cannot precede opening date.');
 if(body.version!=null && (typeof body.version!=='string' || !/^[0-9a-f]{64}$/i.test(body.version)))fail('Settings changed or are out of date. Reload this page.');
 if(body.reason!=null && typeof body.reason!=='string')fail('Reason must be text.');
 const reason=(body.reason || '').trim();
 if(reason.length>500)fail('Reason exceeds 500 characters.');
 const start=new Date(opening+'T00:00:00+05:30');
 const end=new Date(new Date(closing+'T00:00:00+05:30').getTime()+86400000);
 return{openingDate:opening,closingDate:closing,start,end,publish:true,version:body.version || null,reason};
}
function windowState(record,now=new Date()){
 if(!record?.isPublished)return 'Draft';
 if(now<new Date(record.startsAtUtc))return 'Scheduled';
 if(now>=new Date(record.endsAtUtc))return 'Closed';
 return 'Open';
}
module.exports={fail,yearId,normalize,windowState};
