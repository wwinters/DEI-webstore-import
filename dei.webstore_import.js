/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       12 Sep 2016     wwinters			Scheduled Script to Import Customer csv import files and order csv import files
 * 												Files to be uploaded to NetSuite to respective import folder in file cabinet.
 * 												Create six new folders in filing cabinet and enter the internal ids in the code below
 * 												Enter the internal ids of the saved csv imports below as well.
 * 												Also update the employee id of the email address sending from NetSuite as well as the recipient email address
 * 												Set the scheduled script function to DEI.Service.SCH.import
 *												Deploy with schedule to run every 15 minutes, no end date, execute as administrator
 *
 *1.10		24 Sep 2016		wwinters			Request to make the following changes:
 *												Run script only on demand using shortcut - SEE SUITLET SCRIPT - schedule_script.js
 *												Change upload folder to 1 folder with file names of orders.csv & clients.csv (User customizable)
 *												__ORDER_FOLDER:	106339	//File Cabinet ID of Main Folder
 *												Check if upload folder has files then move the files to their respective folder and run the script
 *												Appends time stamp to each file name to move files into pending folder to not overwrite the previous files.
 *
 * 1.20		7 Dec 2017		wwinters			Add logic to import item fulfillments as sales order transforms
 * 									
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */

if (typeof (DEI) == 'undefined') {
	DEI = {
		__namespace : true
	};
}

DEI.Service = {
		SCH: {
			 __UPLOAD_FOLDER:				106339	//File Cabinet ID of Folder to upload files
			,__ORDER_FILENAME:				'orders.csv'
			,__CLIENT_FILENAME:				'clients.csv'
			
			,__CUSTOMER_PENDING_FOLDER: 	106340 //File Cabinet ID of Folder containing pending customer import files
			,__CUSTOMER_COMPLETED_FOLDER:	106344 //File Cabinet ID of Folder containing completed customer import files
			,__CUSTOMER_ERROR_FOLDER:		106342 //File Cabinet ID of Folder containing customer import files that did not complete due to error
			
			,__ORDER_PENDING_FOLDER: 		106341 //File Cabinet ID of Folder containing pending order import files
			,__ORDER_COMPLETED_FOLDER:		106345 //File Cabinet ID of Folder containing completed order import files
			,__ORDER_ERROR_FOLDER:			106343 //File Cabinet ID of Folder containing order import files that did not complete due to error
			
			,__FULFILLMENT_PENDING_FOLDER:		536242
			,__FULFILLMENT_COMPLETED_FOLDER:	536243
			,__FULFILLMENT_ERROR_FOLDER:		536244
			
			,__CUSTOMER_SAVED_IMPORT:		52 //Internal ID of Saved Customer CSV Import
			,__ORDER_SAVED_IMPORT:			53 //Internal ID of Saved Order CSV Import
			
			,__RECIPIENT_EMAIL:				'customerservice@deiequipment.com'  //Replace with correct email address
			,__SENDER_EMPLOYEE_ID:			-5						//Replace with correct employee id
			
			
			,import: function() {
				var funcName = 'import';
				var customerImportURL = null, orderImportURL = null, email_body = '';
				var statusURL = 'https://system.na2.netsuite.com/app/setup/upload/csv/uploadlogcsv.nl?wqid=';
				nlapiLogExecution('DEBUG', funcName, '*Entry Log*');
				
				try {
					//Look for files in upload folder named orders.csv and clients.csv
					var uploadedFiles = DEI.Service.FC.getFiles(this.__UPLOAD_FOLDER);
					if (uploadedFiles) {
						nlapiLogExecution('DEBUG', funcName, 'Uploaded File(s) Found');
						DEI.Service.FC.moveFiles(uploadedFiles);
					}
				}
				
				catch(e) {
					(e instanceof nlobjError) ? nlapiLogExecution('ERROR', 'System Error', e.getCode() + '<br/>' + e.getDetails()) : 
                        nlapiLogExecution('ERROR', 'Unexpected Error', e.toString()); 
				}
				try {
					// Look for import file of customers from web store
					var customerFiles = DEI.Service.FC.getFiles(this.__CUSTOMER_PENDING_FOLDER);
					var orderFiles =	DEI.Service.FC.getFiles(this.__ORDER_PENDING_FOLDER);
					
					if (customerFiles) {
						nlapiLogExecution('DEBUG', funcName, 'Customer Import File(s) Found');
						var customerImport = DEI.Service.DB.csvImport(
								customerFiles,this.__CUSTOMER_SAVED_IMPORT,this.__CUSTOMER_COMPLETED_FOLDER,this.__CUSTOMER_ERROR_FOLDER
								);
						if (customerImport == 'error') {
							nlapiSendEmail(this.__SENDER_EMPLOYEE_ID, this.__EMAIL, 'CSV Customer Import Error', 'CSV Customer Import Error');
						}
						else {
							customerImportURL = statusURL + customerImport;
						}
					}
					
					if (orderFiles) {
						nlapiLogExecution('DEBUG', funcName, 'Order Import File(s) Found');
						var orderImport = DEI.Service.DB.csvImport(
								orderFiles,this.__ORDER_SAVED_IMPORT,this.__ORDER_COMPLETED_FOLDER,this.__ORDER_ERROR_FOLDER
								);
						if (orderImport == 'error') {
							nlapiSendEmail(this.__EMAIL, this.__RECIPIENT_EMAIL, 'CSV Order Import Error', 'CSV Order Import Error');
						}
						else {
							orderImportURL = statusURL + orderImport;
						}
					}

				} catch(e) {
	                (e instanceof nlobjError) ? nlapiLogExecution('ERROR', 'System Error', e.getCode() + '<br/>' + e.getDetails()) : 
	                                            nlapiLogExecution('ERROR', 'Unexpected Error', e.toString()); 
	            }
				// Removed so we don't receive emails about imports DEI
				//if (customerImportURL != null) {
				//	email_body += 'Customer Import:<br /><a href="' + customerImportURL + '">' + customerImportURL + '</a><br />';
				//}
				//if (orderImportURL != null) {
				//	email_body += 'Order Import:<br /><a href="' + orderImportURL + '">' + orderImportURL + '</a><br />';
				//}
				//if (email_body) {
				//	nlapiSendEmail(this.__SENDER_EMPLOYEE_ID, this.__RECIPIENT_EMAIL, 'CSV Import Processing', email_body);
				//}
				
				//Import CSV files to transform sales orders to item fulfillments
				try{
					//Look for import file of item fulfillments
					var ifFiles = DEI.Service.FC.getFiles(this.__FULFILLMENT_PENDING_FOLDER);
					if (ifFiles) {
						nlapiLogExecution('DEBUG', funcName, 'Fulfillment Import File(s) Found');
						var fulfillmentImport = DEI.Service.DB.transform(
								ifFiles,this.FULFILLMENT_COMPLETED_FOLDER,this.__FULFILLMENT_ERROR_FOLDER
								);
						if (fulfillmentImport == 'error') {
							nlapiSendEmail(this.__EMAIL, this.__RECIPIENT_EMAIL, 'CSV Fulfillment Import Error', 'CSV Fulfillment Import Error');
						}
						else {
							email_body += fulfillmentImport + ' Fulfillment Record(s) Imported<br />';
						}
					}
				} catch(e) {
	                (e instanceof nlobjError) ? nlapiLogExecution('ERROR', 'System Error', e.getCode() + '<br/>' + e.getDetails()) : 
                        nlapiLogExecution('ERROR', 'Unexpected Error', e.toString()); 
				}
				
				//Remove Files older than specified # of days
				var completed_customer_files = DEI.Service.FC.getFiles(this.__CUSTOMER_COMPLETED_FOLDER,this.__NUMBER_OF_DAYS_TO_HOLD_COMPLETED_JOBS);
				var completed_order_files = DEI.Service.FC.getFiles(this.__ORDER_COMPLETED_FOLDER,this.__NUMBER_OF_DAYS_TO_HOLD_COMPLETED_JOBS);
				
				DEI.Service.FC.removeFiles(completed_customer_files);
				DEI.Service.FC.removeFiles(completed_order_files);
			}
		}
		
		,FC: {
			getFiles: function(folderId,toRemove) {
				var filters = [];
				filters.push(new nlobjSearchFilter('folder', null, 'is', folderId));
				if (toRemove) {
					filters.push(new nlobjSearchFilter('modified', null, 'before' , 'daysago' + toRemove));
				}
				var file_results = nlapiSearchRecord('file', null, filters);
				return file_results;
			}
		
			,removeFiles: function(fileArray) {
				for (var i in fileArray) {
					var fileId = fileArray[i].getId();
					try {
					    nlapiDeleteFile(fileId);
					} catch (e) {
						(e instanceof nlobjError) ? nlapiLogExecution('DEBUG', 'System Error - Deleting File', e.getCode() + '<br/>' + e.getDetails()) :
							nlapiLogExecution('DEBUG', 'Unexpected Error - Deleting File', e.toString());
						return 'error';
					}
				}
			}
			
			,moveFiles: function(fileArray) {
				for (var i in fileArray) {
					var file_result = fileArray[i];
					var fileId = file_result.getId();
					var file = nlapiLoadFile(fileId);
					var fileName = file.getName().toLowerCase();
					var fileType = file.getType();
					var fileContents = file.getValue();
					if (fileName == DEI.Service.SCH.__ORDER_FILENAME) {
						try {
							fileName += Date.now().toString();
							var copiedFile = nlapiCreateFile(fileName,fileType,fileContents);
							copiedFile.setFolder(DEI.Service.SCH.__ORDER_PENDING_FOLDER);
							nlapiSubmitFile(copiedFile);
							nlapiDeleteFile(fileId);
						}
						catch (e) {
							(e instanceof nlobjError) ? nlapiLogExecution('DEBUG', 'System Error - Moving Order Upload File', e.getCode() + '<br/>' + e.getDetails()) : 
								nlapiLogExecution('DEBUG', 'Unexpected Error - Moving Order Upload File', e.toString());
						}
					}
					else if (fileName == DEI.Service.SCH.__CLIENT_FILENAME) {
						try {
							fileName += Date.now().toString();
							var copiedFile = nlapiCreateFile(fileName,fileType,fileContents);
							copiedFile.setFolder(DEI.Service.SCH.__CUSTOMER_PENDING_FOLDER);
							nlapiSubmitFile(copiedFile);
							nlapiDeleteFile(fileId);
						}
						catch (e) {
							(e instanceof nlobjError) ? nlapiLogExecution('DEBUG', 'System Error - Moving Client Upload File', e.getCode() + '<br/>' + e.getDetails()) : 
								nlapiLogExecution('DEBUG', 'Unexpected Error - Moving Client Upload File', e.toString());
						}
					}
				}
			}
		}
		
		,DB: {
			csvImport: function (fileArray,savedImport,folderId,errorFolderId) {
				var jobId = null;
				for (var i in fileArray) {
					var file_result = fileArray[i];
					var fileId = file_result.getId();
					var file = nlapiLoadFile(fileId);
					var fileName = file.getName();
					var fileType = file.getType();
					var fileContents = file.getValue();
					var job = nlapiCreateCSVImport();
					job.setMapping(savedImport);
					job.setPrimaryFile(fileContents);
					try {
						jobId = nlapiSubmitCSVImport(job);	//100 governance units
					} catch (err) {
						(err instanceof nlobjError) ? nlapiLogExecution('DEBUG', 'System Error - Job ID ' + jobId, err.getCode() + '<br/>' + err.getDetails()) : 
							nlapiLogExecution('DEBUG', 'Unexpected Error - Job ID ' + jobId, err.toString());
						try {
							var copiedFile = nlapiCreateFile(fileName, fileType, fileContents);
							copiedFile.setFolder(errorFolderId);
						} catch (e) {
							(e instanceof nlobjError) ? nlapiLogExecution('DEBUG', 'System Error - Moving File', e.getCode() + '<br/>' + e.getDetails()) : 
								nlapiLogExecution('DEBUG', 'Unexpected Error - Moving File', e.toString());
							return 'error';
						}
					}	
					nlapiLogExecution('DEBUG', 'CSV Import Processing', fileName);
					try {
						var copiedFile = nlapiCreateFile(fileName, fileType, fileContents);
						copiedFile.setFolder(folderId);
					} catch (e) {
						(e instanceof nlobjError) ? nlapiLogExecution('DEBUG', 'System Error - Moving File', e.getCode() + '<br/>' + e.getDetails()) : 
							nlapiLogExecution('DEBUG', 'Unexpected Error - Moving File', e.toString());
						return 'error';
					}
					try {
						nlapiSubmitFile(copiedFile);
					    nlapiDeleteFile(fileId);
					} catch (e) {
						(e instanceof nlobjError) ? nlapiLogExecution('DEBUG', 'System Error - Saving File', e.getCode() + '<br/>' + e.getDetails()) : 
							nlapiLogExecution('DEBUG', 'Unexpected Error - Saving File', e.toString());
						return 'error';
					}
				}
				return jobId;
			}
		
			,transform: function (fileArray,folderId,errorFolderId) {
				var importedRecords = 0;
				var salesorderSearch = nlapiSearchRecord("salesorder",null,
						[
							   ["type","anyof","SalesOrd"], 
							   "AND", 
							   ["mainline","is","T"], 
							   "AND", 
							   ["status","anyof","SalesOrd:B","SalesOrd:D","SalesOrd:E"]
						], 
						[
							new nlobjSearchColumn("externalid",null,null)
						]
				);
				var getInternalIdFromExternalId = function(salesorderSearch,extid) {
					for (var i=0; i<salesorderSearch.length; i++) {
						if (salesorderSearch[i].getValue('externalid') == extid) {
							return salesorderSearch[i].getId();
						}
					}
					return null;
				};
				var csvTojs = function(csv) {
					var lines=csv.split("\n");
					var result = [];
					var headers=lines[0].split(",");
					for(var i=1;i<lines.length;i++){
						var obj = {};
						var currentline=lines[i].split(",");
						for(var j=0;j<headers.length;j++){
							obj[headers[j]] = currentline[j];
						}
						result.push(obj);
					}
					return result; //JavaScript object
					  //return JSON.stringify(result); //JSON
				};
				for (var i in fileArray) {
					var file_result = fileArray[i];
					var fileId = file_result.getId();
					var file = nlapiLoadFile(fileId);
					var fileName = file.getName();
					var fileType = file.getType();
					var fileContents = file.getValue();
					try {
						//Parse CSV to JSON object
						var objFulfillmentData = csvTojs(fileContents);
						for (var l=0; l<objFulfillmentData.length; l++) {
							var soID = getInternalIdFromExternalId(l.ExtId);
							if (soID) {
								//Transform sales order
								var ifRec = nlapiTransformRecord('salesorder',soID,'itemfulfillment');
								//Set all lines to shipped
								var lines = ifRec.getLineItemCount('item');
								for (var j=1; j <=lines; j++) {
									ifRec.setLineItemValue('item','itemreceive',j,'T');
								}
								//Set ship method and tracking info
								ifRec.setLineItemValue('package','packagetrackingnumber',1,l.Tracking);
								ifRec.setLineItemValue('package','packageweight',1,1);
								ifRec.setLineItemValue('package','packagedescr',1,l.ShipMethod);
								//Set date
								ifRec.setFieldValue('trandate',l.Date);
								
							}
							else {
								//Sales order not found
								nlapiSendEmail(this.__SENDER_EMPLOYEE_ID, this.__RECIPIENT_EMAIL, 'CSV Fulfillment Processing Error', 'Sales Order Needing Fulfillment not found with externalid: ' + l.ExtId);
								continue;
							}
							//Increment count
							importedRecords++;
						}
					} catch (err) {
						(err instanceof nlobjError) ? nlapiLogExecution('DEBUG', 'System Error - Job ID ' + jobId, err.getCode() + '<br/>' + err.getDetails()) : 
							nlapiLogExecution('DEBUG', 'Unexpected Error - Job ID ' + jobId, err.toString());
						try {
							var copiedFile = nlapiCreateFile(fileName, fileType, fileContents);
							copiedFile.setFolder(errorFolderId);
						} catch (e) {
							(e instanceof nlobjError) ? nlapiLogExecution('DEBUG', 'System Error - Moving File', e.getCode() + '<br/>' + e.getDetails()) : 
								nlapiLogExecution('DEBUG', 'Unexpected Error - Moving File', e.toString());
							return 'error';
						}
					}
					nlapiLogExecution('DEBUG', 'CSV Import Complete', fileName);
					try {
						var copiedFile = nlapiCreateFile(fileName, fileType, fileContents);
						copiedFile.setFolder(folderId);
					} catch (e) {
						(e instanceof nlobjError) ? nlapiLogExecution('DEBUG', 'System Error - Moving File', e.getCode() + '<br/>' + e.getDetails()) : 
							nlapiLogExecution('DEBUG', 'Unexpected Error - Moving File', e.toString());
						return 'error';
					}
					try {
						nlapiSubmitFile(copiedFile);
						nlapiDeleteFile(fileId);
					} catch (e) {
						(e instanceof nlobjError) ? nlapiLogExecution('DEBUG', 'System Error - Saving File', e.getCode() + '<br/>' + e.getDetails()) : 
							nlapiLogExecution('DEBUG', 'Unexpected Error - Saving File', e.toString());
						return 'error';
					}
				}
				return importedRecords;
			}
		}
};