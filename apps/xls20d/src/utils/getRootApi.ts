import { getChainApi } from "@trncs/utils/getChainApi";
import { rootWSEndpoint } from "@trncs/xls20d/config";

export const getRootApi = getChainApi.bind(null, rootWSEndpoint);
