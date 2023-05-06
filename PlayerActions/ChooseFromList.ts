import Data from './ChooseFromList/Data';
import PlayerAction from '@civ-clone/core-player/PlayerAction';

export class ChooseFromList extends PlayerAction<
  Data<keyof ChoiceMetaDataMap>
> {}

export default ChooseFromList;
