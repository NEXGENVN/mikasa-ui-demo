import {sourceFieldAppearances} from './source-field-appearance-catalog.mjs';

/** Resolve only fonts and paints proved by an original source field or matching entered reference. */
export function sourceFieldFont(control,slot=control.textSlots?.[0],{entered=false}={}){
 const current=slot?.font||control.font||{},appearance=sourceFieldAppearances[slot?.id];
 if(entered&&appearance?.valueFont)return {...current,...appearance.valueFont};
 if(appearance?.color)return {...current,color:appearance.color};
 // Mixed or absent original ink has no single proved paint. Leave the binder's
 // per-path source paint intact rather than forcing the native metadata color.
 const {color,...typography}=current;return typography;
}
