import ChoiceMeta from '@civ-clone/core-client/ChoiceMeta';
export declare class Data<
  Name extends keyof ChoiceMetaDataMap,
  Type = ChoiceMetaDataMap[Name]
> {
  #private;
  constructor(meta: ChoiceMeta<Name>);
  choose(value: Type): void;
  meta(): ChoiceMeta<Name>;
  value(): Type | undefined;
}
export default Data;
