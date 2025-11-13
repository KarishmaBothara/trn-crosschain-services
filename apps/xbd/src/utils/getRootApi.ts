import { getChainApi } from "@trncs/utils/getChainApi";
import { rootWSEndpoint } from "@trncs/xbd/config";

export const getRootApi = getChainApi.bind(null, rootWSEndpoint);
